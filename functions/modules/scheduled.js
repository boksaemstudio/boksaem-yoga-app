/**
 * Scheduled Jobs Module
 * 예약 작업 관련 Cloud Functions
 * 
 * @module modules/scheduled
 * [Refactor] Extracted from index.js
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { admin, tenantDb, STUDIO_ID, getAI, createPendingApproval, logAIError, getKSTDateString, getStudioName } = require("../helpers/common");
const { getStudioUrl } = require('../helpers/urls');
const chunk = require('lodash/chunk');

// [TEMP] 안면인식 확인용
exports.checkFaceInfo = onRequest({ region: "asia-northeast3" }, async (req, res) => {
    try {
        const snap = await admin.firestore().collection('studios/boksaem-yoga/members').get();
        let results = [];
        snap.forEach(doc => {
            const data = doc.data();
            if (data.phone && data.phone.endsWith('2789')) {
                const hasFace = !!((data.faceDescriptors && data.faceDescriptors.length > 0) || data.faceDescriptor);
                results.push({ name: data.name, phone: data.phone, hasFace, status: data.status });
            }
        });
        res.status(200).send(JSON.stringify(results, null, 2));
    } catch(e) { res.status(500).send(e.toString()); }
});

/**
 * 크레딧 소진 알림
 */
exports.checkLowCreditsV2 = onDocumentUpdated({
    document: `studios/{studioId}/members/{memberId}`,
    region: "asia-northeast3"
}, async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();
    const memberId = event.params.memberId;
    const tdb = tenantDb();

    if (newData.credits === oldData.credits) return null;
    // [FIX] || → && : 크레딧이 정확히 0이 되었고(newData.credits !== 0이면 skip), 감소 방향일 때만 알림
    if (newData.credits !== 0 && newData.credits >= oldData.credits) return null;

    try {
        const attendanceSnap = await tdb.collection('attendance').where('memberId', '==', memberId).limit(10).get();
        const stats = attendanceSnap.docs.map(d => d.data().className).join(", ");
        const lang = newData.language || 'ko';
        const ai = getAI();
        
        const body = await ai.generate(`크레딧 소진 알림 (${ai.getLangName(lang)}): ${newData.name}님의 수업권이 모두 소진되었습니다. 수련 패턴: ${stats}`);

        let tokensSnap = await tdb.collection('fcm_tokens').where('memberId', '==', memberId).get();
        if (!tokensSnap.empty) {
            const studioName = await getStudioName();
            await createPendingApproval('low_credits', [memberId], `${studioName} 알림`, body, { credits: 0, prevCredits: oldData.credits });
        }
    } catch (e) {
        console.error(e);
    }
});

/**
 * 일일 관리자 리포트 (23:00 KST)
 */
exports.sendDailyAdminReportV2 = onSchedule({
    schedule: "0 23 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3"
}, async (event) => {
    const tdb = tenantDb();
    const todayStr = getKSTDateString(new Date());

    try {
        // Gather stats
        const [attendanceSnap, registrationSnap, anomalySnap, ghostSnap] = await Promise.all([
            tdb.collection('attendance').where('date', '==', todayStr).get(),
            tdb.collection('members').where('createdAt', '>=', `${todayStr}T00:00:00`).get(),
            tdb.collection('members').where('credits', '<', 0).get(),
            tdb.collection('fcm_tokens').where('updatedAt', '<', new Date(Date.now() - 60*24*60*60*1000).toISOString()).get()
        ]);

        const attendanceCount = attendanceSnap.size;
        const registrationCount = registrationSnap.size;
        const anomalyCount = anomalySnap.size;
        const ghostCount = ghostSnap.size;

        const studioName = await getStudioName();
        const reportBody = `[${studioName} 일일 리포트] ${todayStr}

[출석 / 가입]
- 오늘 출석: ${attendanceCount} 명
- 신규 가입: ${registrationCount} 명

[보안 / 데이터]
- 크레딧 오류: ${anomalyCount}건 ${anomalyCount > 0 ? '⚠️' : '✅'}
- 유령 토큰: ${ghostCount}건 ${ghostCount > 5 ? '⚠️' : '✅'}

오늘 하루도 수고 많으셨습니다. 🙏`;

        let tokensSnap = await tdb.collection('fcm_tokens').where('role', '==', 'admin').get();
        if (!tokensSnap.empty) {
            const tokens = tokensSnap.docs.map(d => d.id);
            await admin.messaging().sendEachForMulticast({
                tokens,
                notification: { title: "일일 리포트", body: reportBody.substring(0, 100) },
                data: { fullReport: reportBody }
            });

            // [PERF] 보안 이상 확인 — tokensSnap 재사용 (이중 조회 제거)
            if (anomalyCount > 0 || ghostCount > 10) {
                const securityMessage = `[긴급 보안 알림] 크레딧 오류: ${anomalyCount}건, 유령 토큰: ${ghostCount}건 - 확인이 필요합니다.`;
                await admin.messaging().sendEachForMulticast({
                    tokens,
                    notification: { title: "보안 알림", body: securityMessage }
                });
            }
        }

    } catch (error) {
        console.error("Daily report failed:", error);
        await logAIError('DailyReport', error);
    }
});

/**
 * 예약 메시지 발송 (매 10분마다 실행)
 */
exports.sendScheduledMessages = onSchedule({
    schedule: "*/10 * * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3"
}, async (event) => {
    const tdb = tenantDb();
    const now = new Date();
    
    console.log(`[Scheduled] Checking for messages to send at ${now.toISOString()}`);

    try {
        // Query for messages that are 'scheduled' and due
        const snapshot = await tdb.collection('messages')
            .where('status', '==', 'scheduled')
            .where('scheduledAt', '<=', now.toISOString())
            .get();

        if (snapshot.empty) {
            console.log('[Scheduled] No messages due.');
            return;
        }

        console.log(`[Scheduled] Found ${snapshot.size} messages to send.`);

        // [FIX] 솔라피→알리고 전환: sms.js 모듈의 sendSMS 사용
        const { sendSMS } = require('./sms');
        const aligoKey = process.env.ALIGO_API_KEY;
        const aligoUserId = process.env.ALIGO_USER_ID;
        const hasAligo = !!(aligoKey && aligoUserId);

        const docsToProcess = snapshot.docs;
        const results = [];

        for (const doc of docsToProcess) {
            const msg = doc.data();
            const memberId = msg.memberId;
            const content = msg.content;
            
            // 1. Send Push
            let pushSuccess = false;
            try {
                // Get Tokens
                let tokensSnap = await tdb.collection("fcm_tokens").where("memberId", "==", memberId).get();
                const tokens = tokensSnap.docs.map(t => t.id);
                
                if (tokens.length > 0) {
                    const payload = {
                        notification: { title: "내요가 예약 알림", body: content },
                        data: { url: getStudioUrl('/member?tab=messages') }
                    };
                    const response = await admin.messaging().sendEachForMulticast({
                        tokens,
                        notification: payload.notification,
                        data: payload.data,
                        android: { notification: { color: "#D4AF37", icon: "stock_ticker_update" } }
                    });
                    pushSuccess = response.successCount > 0;
                }
            } catch (e) {
                console.error(`[Scheduled] Push failed for ${doc.id}:`, e);
            }

            // 2. Send SMS via Aligo — sendMode에 따라 건너뛰기
            let smsResult = null;
            const msgSendMode = msg.sendMode || 'push_first';
            const shouldSendSMS = msgSendMode === 'sms_only' || (msgSendMode === 'push_first' && !pushSuccess);
            
            if (hasAligo && shouldSendSMS) {
                try {
                    const memberDoc = await tdb.collection('members').doc(memberId).get();
                    if (memberDoc.exists) {
                        const phone = memberDoc.data().phone?.replace(/-/g, '');
                        if (phone) {
                            const smsStudioName = await getStudioName();
                            smsResult = await sendSMS(phone, content, `${smsStudioName} 알림`);
                        }
                    }
                } catch (e) {
                    console.error(`[Scheduled] Aligo SMS failed for ${doc.id}:`, e);
                }
            }

            // Prepare updates instead of batching immediately
            results.push({
                ref: doc.ref,
                updateData: {
                    status: 'sent',
                    sentAt: new Date().toISOString(),
                    pushStatus: { sent: pushSuccess, note: 'Scheduled Send' },
                    ...(smsResult ? { smsStatus: smsResult } : {})
                },
                historyData: (pushSuccess || smsResult) ? {
                    type: 'individual_scheduled',
                    title: "예약 알림",
                    body: content,
                    status: 'sent',
                    targetMemberId: memberId,
                    createdAt: new Date()
                } : null
            });
        }

        // Chunking the execution to handle > 500 documents
        // Each result produces 1 to 2 operations (update message, set history)
        // A batch can hold 500 operations. To be perfectly safe, chunk by 200 items (max 400 ops)
        const CHUNK_SIZE = 200;
        const chunks = chunk(results, CHUNK_SIZE);

        for (const batchChunk of chunks) {
            const batch = tdb.raw().batch();
            for (const item of batchChunk) {
                 batch.update(item.ref, item.updateData);
                 if (item.historyData) {
                     const historyRef = tdb.collection('push_history').doc();
                     batch.set(historyRef, item.historyData);
                 }
            }
            await batch.commit();
        }

        console.log(`[Scheduled] Successfully processed ${results.length} messages.`);

    } catch (error) {
        console.error("Scheduled message processing failed:", error);
    }
});

/**
 * 데모 요가원 자동화 (KST 00:05 실행)
 * 살아있는 데모 사이트 유지를 위해 매일 자정 직후 가짜 데이터를 리필합니다.
 */
exports.refreshDemoDataDaily = onSchedule({
    schedule: "5 0 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3"
}, async (event) => {
    try {
        console.log(`[Scheduled] Refreshing demo site data at ${new Date().toISOString()}`);
        const { refreshDemoData } = require('../helpers/demoSeeder');
        await refreshDemoData();
    } catch (e) {
        console.error("[Scheduled] Demo data refresh failed:", e);
    }
});
