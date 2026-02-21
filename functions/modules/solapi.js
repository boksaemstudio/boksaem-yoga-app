/**
 * Solapi Message Module
 * 솔라피(SOLAPI) 알림톡 및 문자 발송 관련 Cloud Functions
 * 
 * @module modules/solapi
 */

const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { admin, logAIError } = require("../helpers/common");
const { SolapiMessageService } = require("solapi");

// Initialize Solapi Service
let messageService;
try {
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    if (apiKey && apiSecret) {
        messageService = new SolapiMessageService(apiKey, apiSecret);
    } else {
        console.warn("[Solapi] API Key or Secret is missing in environment variables.");
    }
} catch (e) {
    console.error("[Solapi] Failed to initialize service:", e);
}

/**
 * 메시지 승인 시 발송 트리거
 * message_approvals 컬렉션의 문서가 'approved' 상태로 변경되면 발송
 */
exports.sendMessageOnApproval = onDocumentUpdated({
    document: "message_approvals/{approvalId}",
    region: "asia-northeast3"
}, async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();
    const approvalId = event.params.approvalId;

    // Only process if status changed to 'approved'
    if (newData.status !== 'approved' || oldData.status === 'approved') return;

    // Prevent double sending
    if (newData.solapiStatus?.sent) {
        console.log(`[Solapi] Message ${approvalId} already sent.`);
        return;
    }

    console.log(`[Solapi] Processing approved message: ${approvalId}`);
    const db = admin.firestore();

    try {
        if (!messageService) {
            throw new Error("Solapi service is not initialized.");
        }

        const targetMemberIds = newData.targetMemberIds || [];
        const content = newData.body || "";
        const title = newData.title || "복샘요가 알림";
        const senderNumber = process.env.SOLAPI_SENDER_NUMBER || "01022232789";

        if (!content) {
            throw new Error("Message content is empty.");
        }

        // 1. Get Target Phone Numbers
        const phoneNumbers = [];
        const memberChunks = [];
        const chunkSize = 10; // Firestore limit for 'in' query

        for (let i = 0; i < targetMemberIds.length; i += chunkSize) {
            memberChunks.push(targetMemberIds.slice(i, i + chunkSize));
        }

        for (const chunk of memberChunks) {
            const snap = await db.collection('members').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
            snap.docs.forEach(doc => {
                const data = doc.data();
                if (data.phone) {
                    // Normalize phone number (remove dashes)
                    const cleanPhone = data.phone.replace(/-/g, '');
                    if (cleanPhone.length >= 10) { // Simple validation
                        phoneNumbers.push({ to: cleanPhone, name: data.name });
                    }
                }
            });
        }

        if (phoneNumbers.length === 0) {
            throw new Error("No valid phone numbers found for targets.");
        }

        // 2. Prepare Messages (LMS/SMS)
        // Note: 알림톡(Kakao AlimTalk) requires templateId. 
        // Failing back to LMS (Long Message Service) for general purpose content like "Holiday Notice".
        const messages = phoneNumbers.map(p => ({
            to: p.to,
            from: senderNumber,
            text: content,
            subject: title, // Used for LMS subject
            kakaoOptions: {
                pfId: process.env.KAKAO_PFID, // Optional: needed for AlimTalk
                templateId: newData.templateId // Optional: needed for AlimTalk
            }
            // If templateId is provided, Solapi tries AlimTalk first, fallbacks to SMS/LMS if failed.
            // If no templateId, it sends SMS/LMS directly.
        }));

        // 3. Send Bulk Messages (limit 1000 per request, handling batching if needed)
        // Solapi SDK handles some batching, but let's be safe with smaller chunks if massive.
        // For typical usage (< 100), SDK's sendMany or sendOne is fine.
        // Solapi sendMany accepts array of messages.
        
        // Split into chunks of 100 for safety
        const sendChunks = [];
        for (let i = 0; i < messages.length; i += 100) {
             sendChunks.push(messages.slice(i, i + 100));
        }

        let successCount = 0;
        let failureCount = 0;
        const groupIds = [];

        for (const chunk of sendChunks) {
            const result = await messageService.send(chunk);
            // Result format depends on SDK version, usually contains groupInfo
            console.log(`[Solapi] Sent chunk result:`, JSON.stringify(result));
            
            // Count approximate success (Solapi async result usually returns Group ID)
            // For precise tracking, we'd need to query status, but for now assume acceptance = success
            successCount += Object.keys(result).length; // Solapi returns map of messageId -> message object usually
            
            // If result has groupId, store it
             const firstKey = Object.keys(result)[0];
             if (result[firstKey]?.groupId) {
                 if (!groupIds.includes(result[firstKey].groupId)) {
                     groupIds.push(result[firstKey].groupId);
                 }
             }
        }

        // 4. Update Approval Doc
        await event.data.after.ref.update({
            solapiStatus: {
                sent: true,
                sentAt: new Date().toISOString(),
                method: newData.templateId ? 'ALIMTALK' : 'LMS',
                recipientCount: phoneNumbers.length,
                successCount, // Approximate until we check report
                groupIds
            }
        });

        // 5. Log to Push History (for visibility)
        await db.collection('push_history').add({
            type: 'solapi_msg',
            title: title,
            body: content,
            status: 'sent',
            targetCount: phoneNumbers.length,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            method: newData.templateId ? '알림톡' : '문자'
        });

    } catch (error) {
        console.error("[Solapi] Sending failed:", error);
        await event.data.after.ref.update({
            solapiStatus: {
                sent: false,
                error: error.message,
                failedAt: new Date().toISOString()
            }
        });
        await logAIError('Solapi_Send_Failed', error);
    }
});

/**
 * 개인 메시지 발송 시 Solapi (알림톡/문자) 전송
 * messages 컬렉션에 문서 생성을 트리거로 함
 */
exports.sendSolapiOnMessageV2 = onDocumentCreated("messages/{messageId}", async (event) => {
    const messageId = event.params.messageId;
    console.log(`[Solapi] Triggered for message ${messageId}`);
    const messageData = event.data.data();
    const memberId = messageData.memberId;
    let content = messageData.content;
    const adminType = messageData.type; // 'admin_individual' or undefined

    // [GUARD] Only process admin messages or specific types, skip if explicitly skipped
    if (messageData.skipSolapi) return;
    
    // [GUARD] Skip scheduled messages (handled by scheduler)
    if (messageData.status === 'scheduled') {
        console.log(`[Solapi] Skipping scheduled message ${messageId}`);
        return;
    }

    if (!memberId || !content) {
        console.log(`[Solapi] Invalid message data for ${messageId}`);
        return;
    }

    try {
        if (!messageService) {
            console.warn("[Solapi] Service not initialized (Missing Keys). Skipping SMS.");
            return;
        }

        const db = admin.firestore();
        const memberDoc = await db.collection('members').doc(memberId).get();
        
        if (!memberDoc.exists) {
            console.warn(`[Solapi] Member ${memberId} not found.`);
            return;
        }

        const memberData = memberDoc.data();
        if (!memberData.phone) {
             console.warn(`[Solapi] Member ${memberId} has no phone number.`);
             return;
        }

        const cleanPhone = memberData.phone.replace(/-/g, '');
        const senderNumber = process.env.SOLAPI_SENDER_NUMBER || "01022232789";

        // [LOGIC] Determine if AlimTalk (Template) or SMS/LMS
        // If messageData has templateId -> AlimTalk
        // Else -> LMS/SMS
        // Currently UI sends plain text, so default to LMS/SMS. 
        // Later we can parse content to find template match if needed, but manual is safer.
        
        const payload = {
            to: cleanPhone,
            from: senderNumber,
            text: content,
            subject: "복샘요가 알림", // LMS Subject
        };

        if (messageData.templateId) {
             payload.kakaoOptions = {
                pfId: process.env.KAKAO_PFID,
                templateId: messageData.templateId
             };
        }

        console.log(`[Solapi] Sending message to ${cleanPhone} (ID: ${messageId})`);
        const result = await messageService.sendOne(payload);
        
        console.log(`[Solapi] Send result:`, JSON.stringify(result));

        // Update message doc with Solapi status
        await event.data.ref.update({
            solapiStatus: {
                sent: true,
                sentAt: new Date().toISOString(),
                method: messageData.templateId ? 'ALIMTALK' : 'LMS',
                result: result,
                recipient: cleanPhone
            }
        });

    } catch (error) {
        console.error("[Solapi] Individual Send Error:", error);
        await event.data.ref.update({
            solapiStatus: {
                sent: false,
                error: error.message,
                failedAt: new Date().toISOString()
            }
        });
    }
});

/**
 * Solapi 잔액 조회 (Callable)
 */
const { onCall } = require("firebase-functions/v2/https");

exports.getSolapiBalance = onCall({
    region: "asia-northeast3",
    cors: ['https://boksaem-yoga.web.app', 'https://boksaem-yoga.firebaseapp.com', 'http://localhost:5173']
}, async (request) => {
    try {
        if (!messageService) {
            // Check env vars again just in case
            const apiKey = process.env.SOLAPI_API_KEY;
            const apiSecret = process.env.SOLAPI_API_SECRET;
            if (!apiKey || !apiSecret) {
               return { connected: false, error: 'API Keys missing' };
            }
        }
        
        return { 
            connected: true, 
            message: "Solapi Linked",
            currency: 'KRW'
        };

    } catch (e) {
        console.error("Balance check failed:", e);
        return { error: e.message };
    }
});
