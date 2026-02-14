/**
 * Push Notification Module
 * 푸시 알림 관련 Cloud Functions
 * 
 * @module modules/push
 * [Refactor] Extracted from index.js
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { admin, getAI, logAIError } = require("../helpers/common");

/**
 * 개인 메시지 푸시 알림
 */
exports.sendPushOnMessageV2 = onDocumentCreated("messages/{messageId}", async (event) => {
    const messageData = event.data.data();
    const memberId = messageData.memberId;
    const content = messageData.content;

    if (!memberId || !content) return;

    try {
        const db = admin.firestore();
        const collections = ["fcm_tokens", "fcmTokens", "push_tokens"];
        let tokens = [];
        let tokenSources = {};

        for (const col of collections) {
            const snap = await db.collection(col).where("memberId", "==", memberId).get();
            snap.forEach(d => {
                if (d.id && !tokens.includes(d.id)) {
                    tokens.push(d.id);
                    tokenSources[d.id] = col;
                }
            });
        }

        if (tokens.length === 0) {
            await event.data.ref.update({
                pushStatus: {
                    sent: false,
                    error: "No registered device found.",
                    sentAt: admin.firestore.FieldValue.serverTimestamp()
                }
            });
            return;
        }

        const payload = {
            notification: { title: "내요가 메시지", body: content },
            data: { url: "https://boksaem-yoga.web.app/member?tab=messages" }
        };

        const response = await admin.messaging().sendEachForMulticast({
            tokens,
            notification: payload.notification,
            data: payload.data,
            webpush: {
                notification: { icon: "https://boksaem-yoga.web.app/logo_circle.png" },
                fcm_options: { link: "https://boksaem-yoga.web.app/member?tab=messages" }
            },
            android: {
                notification: { color: "#D4AF37", icon: "stock_ticker_update" }
            }
        });

        // Clean stale tokens
        const tokensToDelete = [];
        response.responses.forEach((res, idx) => {
            if (!res.success && 
                (res.error?.code === 'messaging/invalid-registration-token' ||
                 res.error?.code === 'messaging/registration-token-not-registered')) {
                tokensToDelete.push({ token: tokens[idx], col: tokenSources[tokens[idx]] });
            }
        });

        if (tokensToDelete.length > 0) {
            const batch = admin.firestore().batch();
            tokensToDelete.forEach(item => {
                batch.delete(admin.firestore().collection(item.col).doc(item.token));
            });
            await batch.commit();
        }

        // Write to push_history
        if (response.successCount > 0) {
            const memberDoc = await db.collection('members').doc(memberId).get();
            const memberName = memberDoc.exists ? memberDoc.data().name : 'Unknown';
            
            await admin.firestore().collection('push_history').add({
                type: 'individual',
                title: payload.notification.title,
                body: payload.notification.body,
                status: 'sent',
                successCount: response.successCount,
                failureCount: response.failureCount,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                targetMemberId: memberId,
                memberName: memberName
            });
        }

        await event.data.ref.update({
            pushStatus: {
                sent: response.successCount > 0,
                successCount: response.successCount,
                failureCount: response.failureCount,
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                cleanupCount: tokensToDelete.length
            }
        });

    } catch (error) {
        console.error("Error sending push:", error);
        await event.data.ref.update({
            pushStatus: { sent: false, error: error.message }
        });
    }
});

/**
 * 대량 푸시 캠페인
 */
exports.sendBulkPushV2 = onDocumentCreated({
    document: "push_campaigns/{campaignId}"
}, async (event) => {
    const snap = event.data;
    const data = snap.data();
    const targetMemberIds = data.targetMemberIds || [];
    const titleOriginal = data.title || "내요가";
    const bodyOriginal = data.body || "";

    if (!bodyOriginal) return;
    if (data.status === 'processing' || data.status === 'sent') return;

    try {
        await snap.ref.update({ status: 'processing', startedAt: admin.firestore.FieldValue.serverTimestamp() });

        const db = admin.firestore();
        const ai = getAI();

        let successTotal = 0;
        let failureTotal = 0;

        // Prepare content by language
        const supportedLangs = ['ko', 'en', 'ru', 'zh', 'ja'];
        const contentsByLang = {};

        for (const lang of supportedLangs) {
            try {
                const title = await ai.translate(titleOriginal, lang);
                const body = await ai.translate(bodyOriginal, lang);
                contentsByLang[lang] = {
                    notification: { title, body },
                    webpush: { notification: { icon: "https://boksaem-yoga.web.app/logo_circle.png" } },
                    android: { notification: { color: "#D4AF37" } }
                };
            } catch (e) {
                contentsByLang[lang] = {
                    notification: { title: titleOriginal, body: bodyOriginal },
                    webpush: { notification: { icon: "https://boksaem-yoga.web.app/logo_circle.png" } },
                    android: { notification: { color: "#D4AF37" } }
                };
            }
        }

        // Stream tokens
        const tokenQuery = db.collection("fcm_tokens");
        const isTargeted = targetMemberIds.length > 0;
        const validTokensByLang = { 'ko': [], 'en': [], 'ru': [], 'zh': [], 'ja': [] };

        const snap2 = await tokenQuery.get();
        snap2.docs.forEach(doc => {
            const tokenData = doc.data();
            const token = doc.id;
            const lang = tokenData.language || 'ko';
            
            if (isTargeted && !targetMemberIds.includes(tokenData.memberId)) return;
            if (!validTokensByLang[lang]) validTokensByLang[lang] = [];
            validTokensByLang[lang].push(token);
        });

        // Send batch by language
        for (const [lang, tokens] of Object.entries(validTokensByLang)) {
            if (tokens.length === 0) continue;
            
            const payload = contentsByLang[lang];
            const chunkSize = 500;
            
            for (let i = 0; i < tokens.length; i += chunkSize) {
                const chunk = tokens.slice(i, i + chunkSize);
                const response = await admin.messaging().sendEachForMulticast({
                    tokens: chunk,
                    ...payload
                });
                successTotal += response.successCount;
                failureTotal += response.failureCount;
            }
        }

        await snap.ref.update({
            status: 'sent',
            successCount: successTotal,
            failureCount: failureTotal,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Write to push_history
        if (successTotal > 0) {
            await admin.firestore().collection('push_history').add({
                type: 'campaign',
                title: titleOriginal,
                body: bodyOriginal,
                status: 'sent',
                successCount: successTotal,
                failureCount: failureTotal,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

    } catch (error) {
        console.error("Bulk push failed:", error);
        await logAIError('BulkPush', error);
        await snap.ref.update({ status: 'failed', error: error.message });
    }
});

/**
 * 공지사항 전체 푸시
 */
exports.sendPushOnNoticeV2 = onDocumentCreated({
    document: "notices/{noticeId}"
}, async (event) => {
    const noticeData = event.data.data();
    // [FEATURE] Check if push is enabled for this notice (default: true)
    if (noticeData.sendPush === false) {
        console.log(`[Push] Notice ${event.params.noticeId} has push disabled. Skipping.`);
        return;
    }

    const titleOriginal = noticeData.title || "새로운 공지사항";
    const bodyOriginal = noticeData.content || "새로운 소식이 등록되었습니다";

    try {
        const db = admin.firestore();
        const ai = getAI();
        const collections = ["fcm_tokens", "fcmTokens", "push_tokens"];
        const tokensByLang = {};

        for (const col of collections) {
            const snap = await db.collection(col).get();
            snap.docs.forEach(doc => {
                const data = doc.data();
                const lang = data.language || 'ko';
                if (!tokensByLang[lang]) tokensByLang[lang] = [];
                if (!tokensByLang[lang].includes(doc.id)) {
                    tokensByLang[lang].push(doc.id);
                }
            });
        }

        let successTotal = 0;
        let failureTotal = 0;

        for (const [lang, tokens] of Object.entries(tokensByLang)) {
            if (tokens.length === 0) continue;

            const title = await ai.translate(titleOriginal, lang);
            const body = await ai.translate(bodyOriginal.substring(0, 100), lang);

            const chunkSize = 500;
            for (let i = 0; i < tokens.length; i += chunkSize) {
                const chunk = tokens.slice(i, i + chunkSize);
                const response = await admin.messaging().sendEachForMulticast({
                    tokens: chunk,
                    notification: { title, body },
                    data: { url: "https://boksaem-yoga.web.app/member?tab=notices" },
                    webpush: { notification: { icon: "https://boksaem-yoga.web.app/logo_circle.png" } },
                    android: { notification: { color: "#D4AF37" } }
                });
                successTotal += response.successCount;
                failureTotal += response.failureCount;
            }
        }

        // Write to push_history
        if (successTotal > 0) {
            await admin.firestore().collection('push_history').add({
                type: 'notice',
                title: titleOriginal,
                body: bodyOriginal.substring(0, 100),
                status: 'sent',
                successCount: successTotal,
                failureCount: failureTotal,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        await event.data.ref.update({
            pushStatus: {
                sent: successTotal > 0,
                successCount: successTotal,
                failureCount: failureTotal
            }
        });

    } catch (error) {
        console.error("Error sending notice push:", error);
        await event.data.ref.update({
            pushStatus: { sent: false, error: error.message }
        });
    }
});

/**
 * 유령 토큰 정기 정리 (매주 일요일 새벽 4시)
 */
exports.cleanupGhostTokens = onSchedule({
    schedule: '0 4 * * 0',
    timeZone: 'Asia/Seoul'
}, async (event) => {
    const db = admin.firestore();
    const batchSize = 400;
    let totalDeleted = 0;

    try {
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        
        const ghostSnap = await db.collection("fcm_tokens")
            .where("updatedAt", "<", twoMonthsAgo.toISOString())
            .limit(batchSize)
            .get();

        if (!ghostSnap.empty) {
            const batch = db.batch();
            ghostSnap.docs.forEach(doc => {
                batch.delete(doc.ref);
                totalDeleted++;
            });
            await batch.commit();
        }

        console.log(`Ghost token cleanup: ${totalDeleted} tokens deleted`);
        await logAIError('System_Cleanup', { deleted: totalDeleted, type: 'GhostTokenCleanup' });

    } catch (error) {
        console.error("Cleanup failed:", error);
        await logAIError('System_Cleanup_Failed', error);
    }
});
