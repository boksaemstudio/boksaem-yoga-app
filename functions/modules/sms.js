/**
 * SMS Message Module (Aligo)
 * 알리고(Aligo) REST API를 통한 SMS/LMS 발송 Cloud Functions
 * 
 * 기존 솔라피(Solapi)에서 알리고로 전환됨 (비용 절감)
 * SMS 8.4원, LMS 25원, MMS 60원
 * 
 * @module modules/sms
 */

const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall } = require("firebase-functions/v2/https");
const { admin, tenantDb, STUDIO_ID, logAIError, getStudioName } = require("../helpers/common");
const https = require("https");

// ─── Aligo API Configuration ───
const ALIGO_API_URL = "https://apis.aligo.in/send/";
const ALIGO_REMAIN_URL = "https://apis.aligo.in/remain/";

function getAligoConfig() {
    return {
        key: process.env.ALIGO_API_KEY || "",
        user_id: process.env.ALIGO_USER_ID || "",
        sender: process.env.ALIGO_SENDER || process.env.SOLAPI_SENDER_NUMBER || "01022232789",
        testmode: process.env.ALIGO_TEST_MODE || "N" // 'Y' for testing without charges
    };
}

/**
 * 알리고 REST API 호출 (POST, application/x-www-form-urlencoded)
 */
function aligoRequest(url, params) {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams(params).toString();
        const urlObj = new URL(url);

        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname,
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    resolve({ result_code: -1, message: data });
                }
            });
        });

        req.on("error", (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

/**
 * 단일 문자 발송 (알리고)
 * @param {string} receiver - 수신자 번호 (하이픈 없이)
 * @param {string} msg - 메시지 내용
 * @param {string} [title] - LMS 제목 (선택)
 * @param {string} [msgType] - SMS/LMS/MMS (미지정 시 자동 판별)
 */
async function sendSMS(receiver, msg, title, msgType) {
    const config = getAligoConfig();
    if (!config.key || !config.user_id) {
        throw new Error("[Aligo] API Key or User ID is missing in environment variables.");
    }

    const params = {
        key: config.key,
        user_id: config.user_id,
        sender: config.sender,
        receiver: receiver,
        msg: msg,
        testmode_yn: config.testmode
    };

    if (title) params.title = title;
    if (msgType) params.msg_type = msgType;

    const result = await aligoRequest(ALIGO_API_URL, params);
    console.log(`[Aligo] Send result:`, JSON.stringify(result));

    if (result.result_code && Number(result.result_code) < 0) {
        throw new Error(`[Aligo] Send failed: ${result.message} (code: ${result.result_code})`);
    }

    return result;
}

// [EXPORT] push.js 등 다른 모듈에서 sendSMS 직접 호출 가능하도록 export
exports.sendSMS = sendSMS;

/**
 * 대량 문자 발송 (알리고 - 쉼표 구분 최대 1000명)
 * @param {string[]} receivers - 수신자 번호 배열
 * @param {string} msg - 메시지 내용
 * @param {string} [title] - LMS 제목 (선택)
 */
async function sendBulkSMS(receivers, msg, title) {
    const config = getAligoConfig();
    if (!config.key || !config.user_id) {
        throw new Error("[Aligo] API Key or User ID is missing in environment variables.");
    }

    // 알리고는 receiver를 쉼표로 구분하여 최대 1000명까지
    const chunks = [];
    for (let i = 0; i < receivers.length; i += 1000) {
        chunks.push(receivers.slice(i, i + 1000));
    }

    const results = [];
    for (const chunk of chunks) {
        const params = {
            key: config.key,
            user_id: config.user_id,
            sender: config.sender,
            receiver: chunk.join(","),
            msg: msg,
            testmode_yn: config.testmode
        };

        if (title) params.title = title;

        const result = await aligoRequest(ALIGO_API_URL, params);
        console.log(`[Aligo] Bulk send chunk (${chunk.length} recipients):`, JSON.stringify(result));
        results.push(result);
    }

    return results;
}


// ═══════════════════════════════════════════════════════════════
// Cloud Functions (기존 솔라피와 동일한 함수명 유지)
// ═══════════════════════════════════════════════════════════════

/**
 * 메시지 승인 시 발송 트리거
 * message_approvals 컬렉션의 문서가 'approved' 상태로 변경되면 발송
 */
exports.sendMessageOnApproval = onDocumentUpdated({
    document: `studios/{studioId}/message_approvals/{approvalId}`,
    region: "asia-northeast3",
    timeoutSeconds: 300,
    memory: "512MiB"
}, async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();
    const approvalId = event.params.approvalId;

    // Only process if status changed to 'approved'
    if (newData.status !== 'approved' || oldData.status === 'approved') return;

    // Prevent double sending
    if (newData.smsStatus?.sent || newData.solapiStatus?.sent) {
        console.log(`[Aligo] Message ${approvalId} already sent.`);
        return;
    }

    console.log(`[Aligo] Processing approved message: ${approvalId}`);
    const tdb = tenantDb();

    try {
        const config = getAligoConfig();
        if (!config.key || !config.user_id) {
            throw new Error("Aligo API is not configured (missing key/user_id).");
        }

        const targetMemberIds = newData.targetMemberIds || [];
        const content = newData.body || "";
        const studioName = await getStudioName();
        const title = newData.title || `${studioName} 알림`;

        if (!content) {
            throw new Error("Message content is empty.");
        }

        // 1. Get Target Phone Numbers
        const phoneNumbers = [];
        const memberChunks = [];
        const chunkSize = 10; // Firestore 'in' query limit

        for (let i = 0; i < targetMemberIds.length; i += chunkSize) {
            memberChunks.push(targetMemberIds.slice(i, i + chunkSize));
        }

        for (const chunk of memberChunks) {
            const snap = await tdb.collection('members').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
            snap.docs.forEach(doc => {
                const data = doc.data();
                if (data.phone) {
                    const cleanPhone = data.phone.replace(/-/g, '');
                    if (cleanPhone.length >= 10) {
                        phoneNumbers.push(cleanPhone);
                    }
                }
            });
        }

        if (phoneNumbers.length === 0) {
            throw new Error("No valid phone numbers found for targets.");
        }

        // 2. Send Bulk SMS via Aligo
        const results = await sendBulkSMS(phoneNumbers, content, title);

        let successCount = 0;
        for (const r of results) {
            if (r.result_code && Number(r.result_code) >= 0) {
                successCount += parseInt(r.success_cnt || 0, 10);
            }
        }

        // 3. Update Approval Doc
        await event.data.after.ref.update({
            smsStatus: {
                sent: true,
                sentAt: new Date().toISOString(),
                method: 'SMS', // 알리고는 자동 SMS/LMS 판별
                recipientCount: phoneNumbers.length,
                successCount,
                provider: 'aligo'
            }
        });

        // 4. Log to Push History
        await tdb.collection('push_history').add({
            type: 'sms_msg',
            title: title,
            body: content,
            status: 'sent',
            targetCount: phoneNumbers.length,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            method: '문자',
            provider: 'aligo'
        });

    } catch (error) {
        console.error("[Aligo] Sending failed:", error);
        await event.data.after.ref.update({
            smsStatus: {
                sent: false,
                error: error.message,
                failedAt: new Date().toISOString()
            }
        });
        await logAIError('Aligo_Send_Failed', error);
    }
});

/**
 * 개인 메시지 발송 시 Aligo SMS/LMS 전송
 * messages 컬렉션에 문서 생성을 트리거로 함
 */
exports.sendSolapiOnMessageV2 = onDocumentCreated({
    document: `studios/{studioId}/messages/{messageId}`,
    region: "asia-northeast3",
    timeoutSeconds: 120,
    maxInstances: 100
}, async (event) => {
    const messageId = event.params.messageId;
    console.log(`[Aligo] Triggered for message ${messageId}`);
    const messageData = event.data.data();
    const memberId = messageData.memberId;
    let content = messageData.content;

    // [GUARD] Skip if explicitly skipped
    if (messageData.skipSolapi || messageData.skipSms) return;
    
    // [GUARD] Skip scheduled messages
    if (messageData.status === 'scheduled') {
        console.log(`[Aligo] Skipping scheduled message ${messageId}`);
        return;
    }

    if (!memberId || !content) {
        console.log(`[Aligo] Invalid message data for ${messageId}`);
        return;
    }

    try {
        const config = getAligoConfig();
        if (!config.key || !config.user_id) {
            console.warn("[Aligo] API not configured. Skipping SMS.");
            return;
        }

        const tdb = tenantDb();
        const memberDoc = await tdb.collection('members').doc(memberId).get();
        
        if (!memberDoc.exists) {
            console.warn(`[Aligo] Member ${memberId} not found.`);
            return;
        }

        const memberData = memberDoc.data();
        if (!memberData.phone) {
             console.warn(`[Aligo] Member ${memberId} has no phone number.`);
             return;
        }

        const cleanPhone = memberData.phone.replace(/-/g, '');
        const studioName = await getStudioName();
        const title = `${studioName} 알림`;

        // 대량 발송 시 rate limit 방지를 위한 지터 (0~15초)
        const jitterMs = Math.floor(Math.random() * 15000);
        console.log(`[Aligo] Waiting ${jitterMs}ms before sending to ${cleanPhone}...`);
        await new Promise(resolve => setTimeout(resolve, jitterMs));

        console.log(`[Aligo] Sending message to ${cleanPhone} (ID: ${messageId})`);
        const result = await sendSMS(cleanPhone, content, title);

        // Update message doc with SMS status
        await event.data.ref.update({
            smsStatus: {
                sent: true,
                sentAt: new Date().toISOString(),
                method: 'SMS',
                result: result,
                recipient: cleanPhone,
                provider: 'aligo'
            }
        });

    } catch (error) {
        console.error("[Aligo] Individual Send Error:", error);
        await event.data.ref.update({
            smsStatus: {
                sent: false,
                error: error.message,
                failedAt: new Date().toISOString()
            }
        });
    }
});

/**
 * 알리고 잔액 조회 (Callable)
 */
exports.getSolapiBalance = onCall({
    region: "asia-northeast3",
    cors: ['https://boksaem-yoga.web.app', 'https://boksaem-yoga.firebaseapp.com', 'http://localhost:5173']
}, async (request) => {
    try {
        const config = getAligoConfig();
        if (!config.key || !config.user_id) {
            return { connected: false, error: 'Aligo API Keys missing' };
        }

        const result = await aligoRequest(ALIGO_REMAIN_URL, {
            key: config.key,
            user_id: config.user_id
        });

        if (result.result_code && Number(result.result_code) >= 0) {
            return { 
                connected: true, 
                message: "Aligo Connected",
                provider: 'aligo',
                balance: {
                    SMS_CNT: result.SMS_CNT || 0,
                    LMS_CNT: result.LMS_CNT || 0,
                    MMS_CNT: result.MMS_CNT || 0
                },
                currency: 'KRW'
            };
        } else {
            return { connected: false, error: result.message || 'Unknown error' };
        }

    } catch (e) {
        console.error("[Aligo] Balance check failed:", e);
        return { error: e.message };
    }
});
