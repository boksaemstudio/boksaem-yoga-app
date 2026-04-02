/**
 * SMS Message Module (Aligo)
 * 알리고(Aligo) API를 통한 SMS/LMS 발송 Cloud Functions
 * 
 * 기존 비즈뿌리오에서 알리고(Aligo)로 다시 전환
 * 
 * @module modules/sms
 */

const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall } = require("firebase-functions/v2/https");
const { admin, tenantDb, STUDIO_ID, logAIError, getStudioName } = require("../helpers/common");

// ─── Aligo API Configuration ───
const ALIGO_SEND_URL = "https://apis.aligo.in/send/";

function getAligoConfig() {
    return {
        key: "5zefrcpzewkyhmfz8yh985mdh935b2cv",
        userid: "zipsuri0",
        sender: (process.env.ALIGO_SENDER || "").trim() || "01022232789"
    };
}

/**
 * 단일 문자 발송 (알리고)
 */
async function sendSMS(receiver, msg, title, msgType) {
    const config = getAligoConfig();

    const formData = new URLSearchParams();
    formData.append('key', config.key);
    formData.append('user_id', config.userid);
    formData.append('sender', config.sender);
    formData.append('receiver', receiver);
    formData.append('msg', msg);
    if (title) formData.append('title', title);

    const res = await fetch(ALIGO_SEND_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString()
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`[Aligo] Message Send Failed: HTTP ${res.status} ${errText}`);
    }

    const data = await res.json();
    console.log(`[Aligo] Send result:`, JSON.stringify(data));

    if (data.result_code !== '1' && data.result_code !== 1) {
        throw new Error(`[Aligo] Send failed: ${data.message} (code: ${data.result_code})`);
    }

    data.success_cnt = parseInt(data.success_cnt || 1, 10);
    return data;
}

exports.sendSMS = sendSMS;

/**
 * 대량 문자 발송 (알리고)
 */
async function sendBulkSMS(receivers, msg, title) {
    const results = [];
    
    // Aligo API는 receiver를 콤마로 구분하여 최대 1000명까지 발송 가능하지만 안정성을 위해 500 단위 분할
    for (let i = 0; i < receivers.length; i += 500) {
        const chunk = receivers.slice(i, i + 500);
        const receiverString = chunk.join(',');
        
        try {
            const data = await sendSMS(receiverString, msg, title);
            results.push({
                success_cnt: parseInt(data.success_cnt || 0, 10),
                error_cnt: parseInt(data.error_cnt || 0, 10)
            });
        } catch (e) {
            results.push({
                success_cnt: 0,
                error_cnt: chunk.length,
                error: e.message
            });
        }
    }

    return results;
}

// ═══════════════════════════════════════════════════════════════
// Cloud Functions (기존 호출명 유지)
// ═══════════════════════════════════════════════════════════════

exports.sendMessageOnApproval = onDocumentUpdated({
    document: `studios/{studioId}/message_approvals/{approvalId}`,
    region: "asia-northeast3",
    vpcConnector: "passflow-vpc",
    vpcConnectorEgressSettings: "ALL_TRAFFIC",
    timeoutSeconds: 300,
    memory: "512MiB"
}, async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();
    const approvalId = event.params.approvalId;

    if (newData.status !== 'approved' || oldData.status === 'approved') return;

    if (newData.smsStatus?.sent || newData.solapiStatus?.sent) {
        console.log(`[Aligo] Message ${approvalId} already sent.`);
        return;
    }

    console.log(`[Aligo] Processing approved message: ${approvalId}`);
    const tdb = tenantDb();

    try {
        const targetMemberIds = newData.targetMemberIds || [];
        const content = newData.body || "";
        const studioName = await getStudioName();
        const title = newData.title || `${studioName} 알림`;

        if (!content) {
            throw new Error("Message content is empty.");
        }

        const phoneNumbers = [];
        const memberChunks = [];
        const chunkSize = 10; 

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

        const results = await sendBulkSMS(phoneNumbers, content, title);

        let successCount = 0;
        for (const r of results) {
            successCount += parseInt(r.success_cnt || 0, 10);
        }

        await event.data.after.ref.update({
            smsStatus: {
                sent: true,
                sentAt: new Date().toISOString(),
                method: 'SMS', 
                recipientCount: phoneNumbers.length,
                successCount,
                provider: 'aligo'
            }
        });

        await tdb.collection('push_history').add({
            type: 'sms_msg',
            title: title,
            body: content,
            status: 'sent',
            targetCount: phoneNumbers.length,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(), 
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
        
        await tdb.collection('push_history').add({
            type: 'sms_msg',
            title: newData.title || '문자 발송 실패',
            body: newData.body || '',
            status: 'failed',
            targetCount: newData?.targetMemberIds?.length || 0,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            method: '문자',
            provider: 'aligo',
            error: error.message
        });

        await logAIError('Aligo_Send_Failed', error);
    }
});

exports.sendSolapiOnMessageV2 = onDocumentCreated({
    document: `studios/{studioId}/messages/{messageId}`,
    region: "asia-northeast3",
    vpcConnector: "passflow-vpc",
    vpcConnectorEgressSettings: "ALL_TRAFFIC",
    timeoutSeconds: 120,
    maxInstances: 100
}, async (event) => {
    const messageId = event.params.messageId;
    console.log(`[Aligo] Triggered for message ${messageId}`);
    const messageData = event.data.data();
    const memberId = messageData.memberId;
    let content = messageData.content;

    if (messageData.skipSolapi || messageData.skipSms) return;
    if (messageData.status === 'scheduled') return;
    if (!memberId || !content) return;

    try {
        const tdb = tenantDb();
        const memberDoc = await tdb.collection('members').doc(memberId).get();
        if (!memberDoc.exists || !memberDoc.data().phone) return;

        const memberData = memberDoc.data();
        const cleanPhone = memberData.phone.replace(/-/g, '');
        const studioName = await getStudioName();
        const title = `${studioName} 알림`;

        // 지터링 설정
        const jitterMs = Math.floor(Math.random() * 15000);
        await new Promise(resolve => setTimeout(resolve, jitterMs));

        const result = await sendSMS(cleanPhone, content, title);

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

        await tdb.collection('push_history').add({
            type: 'sms_msg',
            title: title,
            body: content,
            status: 'sent',
            targetCount: 1,
            targetMemberId: memberId,
            targetMemberName: memberData.name || '알 수 없음', 
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            method: '문자',
            provider: 'aligo'
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
        
        const tdbRef = tenantDb();
        await tdbRef.collection('push_history').add({
            type: 'sms_msg',
            title: '문자 발송 실패',
            body: content || '',
            status: 'failed',
            targetCount: 1,
            targetMemberId: memberId || null,
            targetMemberName: '알 수 없음',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            method: '문자',
            provider: 'aligo',
            error: error.message
        });
    }
});

exports.getSolapiBalance = onCall({
    region: "asia-northeast3",
    vpcConnector: "passflow-vpc",
    vpcConnectorEgressSettings: "ALL_TRAFFIC",
    cors: require('../helpers/cors').ALLOWED_ORIGINS
}, async (request) => {
    try {
        const config = getAligoConfig();
        
        return { 
            connected: true, 
            message: "Aligo Connected",
            provider: 'aligo',
            balance: {
                SMS_CNT: '무제한 (알리고 대시보드 참조)',
                LMS_CNT: '무제한 (알리고 대시보드 참조)',
                MMS_CNT: '무제한 (알리고 대시보드 참조)'
            },
            currency: 'KRW'
        };
    } catch (e) {
        return { connected: false, error: e.message };
    }
});
