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

/**
 * 복샘요가 전용 알리고 설정 (기본값)
 * 다른 스튜디오는 Firestore studios/{studioId}/settings/aligo 문서에 설정 저장
 */
const BOKSAEM_ALIGO_CONFIG = {
    key: "5zefrcpzewkyhmfz8yh985mdh935b2cv",
    userid: "zipsuri0",
    sender: "010-2223-2789"
};

/**
 * [SaaS] 테넌트별 알리고 설정 조회
 * 
 * - boksaem-yoga: 하드코딩된 기본 설정 사용
 * - demo-yoga: 시뮬레이션 모드 (실제 API 미호출)
 * - 기타 스튜디오: Firestore students/{studioId} 문서의 SMS 설정 조회
 * 
 * @param {string} studioId - 스튜디오 ID
 * @returns {Promise<{key:string, userid:string, sender:string, simulation:boolean} | null>}
 */
async function getAligoConfigForStudio(studioId) {
    // 1. 데모 스튜디오 → 시뮬레이션 모드
    if (studioId === 'demo-yoga') {
        return { ...BOKSAEM_ALIGO_CONFIG, simulation: true };
    }
    
    // 2. 복샘요가 → 기본 설정 (실제 발송)
    if (!studioId || studioId === 'boksaem-yoga') {
        return { ...BOKSAEM_ALIGO_CONFIG, simulation: false };
    }
    
    // 3. 기타 스튜디오 → Firestore에서 설정 조회
    try {
        const db = admin.firestore();
        const configDoc = await db.doc(`studios/${studioId}`).get();
        if (configDoc.exists) {
            const data = configDoc.data();
            const smsConfig = data.SMS_CONFIG || data.smsConfig;
            if (smsConfig && smsConfig.aligoKey && smsConfig.aligoUserId && smsConfig.sender) {
                return {
                    key: smsConfig.aligoKey,
                    userid: smsConfig.aligoUserId,
                    sender: smsConfig.sender,
                    simulation: false
                };
            }
        }
    } catch (e) {
        console.warn(`[SMS] Failed to load Aligo config for ${studioId}:`, e.message);
    }
    
    // 4. 설정 없음 → null 반환 (발송 차단)
    return null;
}

// [레거시 호환] push.js 등에서 기존 getAligoConfig() 호출 지원
function getAligoConfig() {
    return BOKSAEM_ALIGO_CONFIG;
}

/**
 * 단일 문자 발송 (알리고)
 * @param {string} receiver - 수신자 번호
 * @param {string} msg - 메시지 내용
 * @param {string} [title] - 제목 (LMS)
 * @param {string} [msgType] - 메시지 타입
 * @param {string} [studioId] - 발송 스튜디오 ID (테넌트 격리)
 */
async function sendSMS(receiver, msg, title, msgType, studioId) {
    const config = studioId 
        ? await getAligoConfigForStudio(studioId) 
        : BOKSAEM_ALIGO_CONFIG;
    
    // [SaaS] 설정이 없는 스튜디오 → 발송 차단
    if (!config) {
        console.warn(`[SMS] ⚠️ 스튜디오 "${studioId}"에 알리고 발신자 번호가 등록되어 있지 않습니다. 관리자에게 발신자 번호 등록을 요청하세요.`);
        return { 
            result_code: '-1', 
            message: `발신자 번호 미등록 (${studioId}). 관리자에게 문의하세요.`,
            success_cnt: 0,
            _blocked: true 
        };
    }
    
    // [SaaS] 데모 스튜디오 → 시뮬레이션 모드
    if (config.simulation) {
        console.log(`[SMS][SIMULATION] 📱 데모 문자 시뮬레이션 → 수신: ${receiver}, 내용: ${msg.substring(0, 50)}...`);
        return { 
            result_code: '1', 
            message: 'Simulated (demo)', 
            success_cnt: 1,
            _simulated: true 
        };
    }

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
    console.log(`[Aligo] Send result (${studioId || 'boksaem-yoga'}):`, JSON.stringify(data));

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
async function sendBulkSMS(receivers, msg, title, studioId) {
    const results = [];
    
    // Aligo API는 receiver를 콤마로 구분하여 최대 1000명까지 발송 가능하지만 안정성을 위해 500 단위 분할
    for (let i = 0; i < receivers.length; i += 500) {
        const chunk = receivers.slice(i, i + 500);
        const receiverString = chunk.join(',');
        
        try {
            const data = await sendSMS(receiverString, msg, title, undefined, studioId);
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
    const tdb = tenantDb(event.params.studioId);

    try {
        const targetMemberIds = newData.targetMemberIds || [];
        const content = newData.body || "";
        const studioName = await getStudioName(event.params.studioId);
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

        const results = await sendBulkSMS(phoneNumbers, content, title, event.params.studioId);

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

        await logAIError('Aligo_Send_Failed', error, event.params.studioId);
    }
});



exports.getAligoBalance = onCall({
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
