/**
 * SMS Message Module (Ppurio)
 * 비즈뿌리오(Bizppurio) REST API v3를 통한 SMS/LMS 발송 Cloud Functions
 * 
 * 기존 알리고(Aligo)에서 비즈뿌리오(Ppurio)로 전환됨
 * 
 * @module modules/sms
 */

const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall } = require("firebase-functions/v2/https");
const { admin, tenantDb, STUDIO_ID, logAIError, getStudioName } = require("../helpers/common");

// ─── Ppurio API Configuration ───
const PPURIO_API_URL = "https://message.ppurio.com/v1/message";
const PPURIO_TOKEN_URL = "https://message.ppurio.com/v1/token";

function getPpurioConfig() {
    return {
        account: (process.env.PPURIO_ACCOUNT || "").trim(),
        password: (process.env.PPURIO_PASSWORD || "").trim(),
        sender: (process.env.PPURIO_SENDER || "").trim() || "01022232789"
    };
}

let cachedPpurioToken = null;
let tokenExpiresAt = 0;

async function getPpurioToken() {
    if (cachedPpurioToken && Date.now() < tokenExpiresAt) {
        return cachedPpurioToken;
    }
    const config = getPpurioConfig();
    if (!config.account || !config.password) {
        throw new Error("[Ppurio] Missing account or password in env Variables.");
    }

    const basicAuth = Buffer.from(config.account + ':' + config.password).toString('base64');
    
    // Node 22 native fetch
    const res = await fetch(PPURIO_TOKEN_URL, {
        method: "POST",
        headers: {
            "Authorization": `Basic ${basicAuth}`,
            "Content-Type": "application/json"
        }
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`[Ppurio] Token fetch failed: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const tokenVal = data.accesstoken || data.token;
    if (tokenVal) {
        cachedPpurioToken = tokenVal;
        tokenExpiresAt = Date.now() + (20 * 60 * 60 * 1000); 
        return cachedPpurioToken;
    } else {
        throw new Error("[Ppurio] Unexpected token response: " + JSON.stringify(data));
    }
}

/**
 * 단일 문자 발송 (뿌리오)
 */
async function sendSMS(receiver, msg, title, msgType) {
    const config = getPpurioConfig();
    const token = await getPpurioToken();
    const byteLength = Buffer.byteLength(msg, 'utf8');
    const type = msgType ? msgType : (byteLength > 90 ? 'lms' : 'sms');

    const refkey = 'PF_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

    const payload = {
        account: config.account,
        messageType: type === 'lms' ? 'LMS' : 'SMS',
        from: config.sender,
        duplicateFlag: 'Y',
        targetCount: 1,
        targets: [
            { to: receiver }
        ],
        content: msg,
        refKey: refkey
    };

    const res = await fetch(PPURIO_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`[Ppurio] Message Send Failed: HTTP ${res.status} ${errText}`);
    }

    const data = await res.json();
    console.log(`[Ppurio] Send result:`, JSON.stringify(data));

    // Ppurio returns 1000 for success
    if (data.code && data.code !== 1000) {
        throw new Error(`[Ppurio] Send failed: ${data.description} (code: ${data.code})`);
    }

    // Mocking common success fields for compatibility
    data.success_cnt = 1;
    return data;
}

exports.sendSMS = sendSMS;

/**
 * 대량 문자 발송 (뿌리오)
 */
async function sendBulkSMS(receivers, msg, title) {
    const config = getPpurioConfig();
    if (!config.account || !config.password) {
        throw new Error("[Ppurio] API credentials missing.");
    }
    const token = await getPpurioToken();
    const byteLength = Buffer.byteLength(msg, 'utf8');
    const type = byteLength > 90 ? 'lms' : 'sms';

    const results = [];
    
    // Concurrency limit to 50
    for (let i = 0; i < receivers.length; i += 50) {
        const chunk = receivers.slice(i, i + 50);
        const promises = chunk.map(phone => sendSMS(phone, msg, title, type));
        
        const chunkResults = await Promise.allSettled(promises);
        
        let success_cnt = 0;
        chunkResults.forEach(r => {
            if (r.status === 'fulfilled' && r.value.code === 1000) success_cnt++;
        });

        results.push({ success_cnt, error_cnt: chunk.length - success_cnt });
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
        console.log(`[Ppurio] Message ${approvalId} already sent.`);
        return;
    }

    console.log(`[Ppurio] Processing approved message: ${approvalId}`);
    const tdb = tenantDb();

    try {
        const config = getPpurioConfig();
        if (!config.account || !config.password) {
            throw new Error("Ppurio API is not configured.");
        }

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
                provider: 'ppurio'
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
            provider: 'ppurio'
        });

    } catch (error) {
        console.error("[Ppurio] Sending failed:", error);
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
            provider: 'ppurio',
            error: error.message
        });

        await logAIError('Ppurio_Send_Failed', error);
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
    console.log(`[Ppurio] Triggered for message ${messageId}`);
    const messageData = event.data.data();
    const memberId = messageData.memberId;
    let content = messageData.content;

    if (messageData.skipSolapi || messageData.skipSms) return;
    if (messageData.status === 'scheduled') return;
    if (!memberId || !content) return;

    try {
        const config = getPpurioConfig();
        if (!config.account || !config.password) {
            console.warn("[Ppurio] API not configured.");
            return;
        }

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
                provider: 'ppurio'
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
            provider: 'ppurio'
        });

    } catch (error) {
        console.error("[Ppurio] Individual Send Error:", error);
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
            provider: 'ppurio',
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
        const config = getPpurioConfig();
        if (!config.account || !config.password) {
            return { connected: false, error: 'Ppurio API Keys missing' };
        }
        await getPpurioToken();
        
        return { 
            connected: true, 
            message: "Ppurio Connected",
            provider: 'ppurio',
            balance: {
                SMS_CNT: '무제한 (계약 참조)',
                LMS_CNT: '무제한 (계약 참조)',
                MMS_CNT: '무제한 (계약 참조)'
            },
            currency: 'KRW'
        };
    } catch (e) {
        return { connected: false, error: e.message };
    }
});
