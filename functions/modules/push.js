/**
 * Push Notification Module
 * 푸시 알림 관련 Cloud Functions
 * 
 * @module modules/push
 * [Refactor] Extracted from index.js
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { admin, tenantDb, STUDIO_ID, getAI, logAIError, getAllFCMTokens, getStudioName, getStudioLogoUrl } = require("../helpers/common");
const { getStudioUrl } = require('../helpers/urls');

/**
 * 개인 메시지 푸시 알림
 */
exports.sendPushOnMessageV2 = onDocumentCreated({
    document: `studios/{studioId}/messages/{messageId}`,
    region: "asia-northeast3"
}, async (event) => {
    console.log(`[Push] Triggered for message ${event.params.messageId}`);
    const messageData = event.data.data();
    const memberId = messageData.memberId;
    const content = messageData.content;
    const sendMode = messageData.sendMode || 'push_first'; // 'push_only' | 'push_first' | 'sms_only'

    if (!memberId || !content) return;
    
    // [GUARD] Skip scheduled messages (handled by scheduler)
    if (messageData.status === 'scheduled') {
        console.log(`[Push] Skipping scheduled message ${event.params.messageId}`);
        return;
    }

    try {
        const tdb = tenantDb();
        const studioName = await getStudioName();
        const logoUrl = await getStudioLogoUrl();

        let pushResult = null;
        let smsResult = null;

        // ── STEP 1: Push 전송 (push_only or push_first) ──
        if (sendMode !== 'sms_only') {
            const { tokens, tokenSources } = await getAllFCMTokens(null, { memberId });

            if (tokens.length > 0) {
                const response = await admin.messaging().sendEachForMulticast({
                    tokens,
                    // [ROOT FIX] data-only 메시지 — notification 필드 없음
                    // → onBackgroundMessage가 showNotification 직접 호출
                    // → notificationclick 핸들러가 data.url로 올바른 페이지 이동
                    data: { 
                        title: `${studioName} 메시지`, 
                        body: content, 
                        url: "/member?tab=messages",
                        icon: logoUrl || ''
                    },
                    webpush: {
                        headers: { Urgency: 'high' }
                    },
                    android: { priority: 'high' }
                });

                pushResult = {
                    sent: response.successCount > 0,
                    successCount: response.successCount,
                    failureCount: response.failureCount,
                    sentAt: admin.firestore.FieldValue.serverTimestamp()
                };

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
                    const batch = tdb.raw().batch();
                    tokensToDelete.forEach(item => batch.delete(tdb.collection(item.col).doc(item.token)));
                    await batch.commit();
                }
                pushResult.cleanupCount = tokensToDelete.length;
            } else {
                pushResult = { sent: false, error: "No registered device found.", sentAt: admin.firestore.FieldValue.serverTimestamp() };
            }
        }

        // ── STEP 2: SMS 전송 (sms_only OR push_first에서 push 실패 시) ──
        // [FIX] 솔라피→알리고 전환: sms.js 모듈의 aligoRequest 사용
        const shouldSendSMS = sendMode === 'sms_only' || (sendMode === 'push_first' && pushResult && !pushResult.sent);

        if (shouldSendSMS) {
            try {
                const aligoKey = process.env.ALIGO_API_KEY;
                const aligoUserId = process.env.ALIGO_USER_ID;
                const aligoSender = process.env.ALIGO_SENDER || "01022232789";

                if (aligoKey && aligoUserId) {
                    const memberDoc = await tdb.collection('members').doc(memberId).get();
                    if (memberDoc.exists) {
                        const phone = memberDoc.data().phone?.replace(/-/g, '');
                        if (phone) {
                            const { sendSMS } = require('./sms');
                            const result = await sendSMS(phone, content, `${studioName} 알림`);
                            smsResult = { sent: true, result, provider: 'aligo' };
                        } else {
                            smsResult = { sent: false, error: "전화번호 없음" };
                        }
                    } else {
                        smsResult = { sent: false, error: "회원 없음" };
                    }
                } else {
                    smsResult = { sent: false, error: "Aligo API 키 미설정" };
                }
            } catch (smsErr) {
                console.error("[Push] SMS (Aligo) failed:", smsErr);
                smsResult = { sent: false, error: smsErr.message };
            }
        }

        // ── STEP 3: 결과 저장 ──
        const updateData = {};
        if (pushResult) updateData.pushStatus = pushResult;
        if (smsResult) updateData.smsStatus = smsResult;
        // push_only 모드에서는 smsStatus 필드 자체를 저장하지 않음
        await event.data.ref.update(updateData);

        // Write to push_history
        const overallSuccess = (pushResult?.sent) || (smsResult?.sent);
        if (overallSuccess) {
            const memberDoc = await tdb.collection('members').doc(memberId).get();
            const memberName = memberDoc.exists ? memberDoc.data().name : 'Unknown';
            
            await tdb.collection('push_history').add({
                type: 'individual',
                title: `${studioName} 메시지`,
                body: content,
                status: 'sent',
                sendMode,
                successCount: pushResult?.successCount || 0,
                failureCount: pushResult?.failureCount || 0,
                smsResult: smsResult?.sent || false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                targetMemberId: memberId,
                memberName: memberName
            });
        }

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
    document: `studios/{studioId}/push_campaigns/{campaignId}`,
    region: "asia-northeast3"
}, async (event) => {
    const snap = event.data;
    const data = snap.data();
    const targetMemberIds = data.targetMemberIds || [];
    const studioName = await getStudioName();
    const logoUrl = await getStudioLogoUrl();
    const titleOriginal = data.title || studioName;
    const bodyOriginal = data.body || "";

    if (!bodyOriginal) return;
    if (data.status === 'processing' || data.status === 'sent') return;

    try {
        await snap.ref.update({ status: 'processing', startedAt: admin.firestore.FieldValue.serverTimestamp() });

        const tdb = tenantDb();
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
                    webpush: { notification: { icon: logoUrl } },
                    android: { notification: { color: "#D4AF37" } }
                };
            } catch (e) {
                contentsByLang[lang] = {
                    notification: { title: titleOriginal, body: bodyOriginal },
                    webpush: { notification: { icon: logoUrl } },
                    android: { notification: { color: "#D4AF37" } }
                };
            }
        }

        // Stream tokens — [FIX] 테넌트 + 루트 양쪽에서 조회
        const isTargeted = targetMemberIds.length > 0;
        const validTokensByLang = { 'ko': [], 'en': [], 'ru': [], 'zh': [], 'ja': [] };

        const collectTokens = (snapDocs) => {
            snapDocs.forEach(doc => {
                const tokenData = doc.data();
                const token = doc.id;
                const lang = tokenData.language || 'ko';
                if (isTargeted && !targetMemberIds.includes(tokenData.memberId)) return;
                if (!validTokensByLang[lang]) validTokensByLang[lang] = [];
                if (!validTokensByLang[lang].includes(token)) validTokensByLang[lang].push(token);
            });
        };

        const snap2 = await tdb.collection("fcm_tokens").get();
        collectTokens(snap2.docs);

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
            await tdb.collection('push_history').add({
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
    document: `studios/{studioId}/notices/{noticeId}`,
    region: "asia-northeast3"
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
        const tdb = tenantDb();
        const ai = getAI();
        const logoUrl = await getStudioLogoUrl();
        // [FIX] 인라인 3중 컬렉션 순회 → getAllFCMTokens 헬퍼 + 그룹핑
        const { tokens: allTokens } = await getAllFCMTokens(null);
        const tokensByGroup = {};

        // [FIX] 테넌트 + 루트 양쪽에서 토큰 조회 및 그룹핑
        const collectGroupTokens = (snapDocs) => {
            snapDocs.forEach(doc => {
                const data = doc.data();
                const lang = data.language || 'ko';
                const role = data.role === 'instructor' ? 'instructor' : 'member';
                const groupKey = `${lang}_${role}`;
                if (!tokensByGroup[groupKey]) tokensByGroup[groupKey] = [];
                if (!tokensByGroup[groupKey].includes(doc.id)) {
                    tokensByGroup[groupKey].push(doc.id);
                }
            });
        };

        const snap = await tdb.collection('fcm_tokens').get();
        collectGroupTokens(snap.docs);

        let successTotal = 0;
        let failureTotal = 0;

        for (const [groupKey, tokens] of Object.entries(tokensByGroup)) {
            if (tokens.length === 0) continue;

            const [lang, role] = groupKey.split('_');

            const title = await ai.translate(titleOriginal, lang);
            const body = await ai.translate(bodyOriginal.substring(0, 100), lang);

            const clickUrl = role === 'instructor' 
                ? getStudioUrl('/instructor?tab=notices') 
                : getStudioUrl('/member?tab=notices');

            const chunkSize = 500;
            for (let i = 0; i < tokens.length; i += chunkSize) {
                const chunk = tokens.slice(i, i + chunkSize);
                const response = await admin.messaging().sendEachForMulticast({
                    tokens: chunk,
                    // [ROOT FIX] data-only — 클릭 시 올바른 페이지로 이동
                    data: { 
                        title, 
                        body, 
                        url: clickUrl.replace(getStudioUrl(''), ''),
                        icon: logoUrl || ''
                    },
                    webpush: { headers: { Urgency: 'high' } },
                    android: { priority: 'high' }
                });
                successTotal += response.successCount;
                failureTotal += response.failureCount;
            }
        }

        // Write to push_history
        if (successTotal > 0) {
            await tdb.collection('push_history').add({
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
 * 유령 토큰 + 익명 사용자 정기 정리 (매주 일요일 새벽 4시)
 */
exports.cleanupGhostTokens = onSchedule({
    schedule: '0 4 * * 0',
    timeZone: 'Asia/Seoul',
    region: "asia-northeast3",
    memory: "512MiB",
    timeoutSeconds: 300,
}, async (event) => {
    const tdb = tenantDb();
    const batchSize = 400;
    let totalTokensDeleted = 0;
    let totalUsersDeleted = 0;

    try {
        // ── STEP 1: 유령 FCM 토큰 정리 ──
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        
        const ghostSnap = await tdb.collection("fcm_tokens")
            .where("updatedAt", "<", twoMonthsAgo.toISOString())
            .limit(batchSize)
            .get();

        if (!ghostSnap.empty) {
            const batch = tdb.raw().batch();
            ghostSnap.docs.forEach(doc => {
                batch.delete(doc.ref);
                totalTokensDeleted++;
            });
            await batch.commit();
        }

        // ── STEP 2: 익명 Firebase Auth 사용자 정리 ──
        // 키오스크 signInAnonymously()가 생성한 익명 계정 삭제
        let pageToken;
        do {
            const listResult = await admin.auth().listUsers(1000, pageToken);
            pageToken = listResult.pageToken;

            const anonymousUids = listResult.users
                .filter(u => !u.email && !u.phoneNumber)
                .map(u => u.uid);

            if (anonymousUids.length > 0) {
                // 100명씩 배치 삭제
                for (let i = 0; i < anonymousUids.length; i += 100) {
                    const batch = anonymousUids.slice(i, i + 100);
                    const result = await admin.auth().deleteUsers(batch);
                    totalUsersDeleted += result.successCount;
                }
            }
        } while (pageToken);

        console.log(`[Cleanup] Ghost tokens: ${totalTokensDeleted}, Anonymous users: ${totalUsersDeleted}`);

    } catch (error) {
        console.error("Cleanup failed:", error);
        await logAIError('System_Cleanup_Failed', error);
    }
});
