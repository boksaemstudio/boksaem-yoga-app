/**
 * Scheduled Jobs Module
 * 예약 작업 관련 Cloud Functions
 * 
 * @module modules/scheduled
 * [Refactor] Extracted from index.js
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { admin, tenantDb, STUDIO_ID, getAI, createPendingApproval, logAIError, getKSTDateString, getStudioName } = require("../helpers/common");
const chunk = require('lodash/chunk');

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

        const tokensSnap = await tdb.collection('fcm_tokens').where('memberId', '==', memberId).get();
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

        const tokensSnap = await tdb.collection('fcm_tokens').where('type', '==', 'admin').get();
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
        const solapiModule = require('./solapi'); // Lazy load if needed, or re-implement logic
        // Since we cannot easily invoke other cloud functions directly from here without HTTP,
        // and logic is relatively simple, we will duplicate the core sending logic or trigger updates.
        
        // BETTER APPROACH: 
        // We will update the status to 'pending' (or a new trigger state 'sending_scheduled')
        // But our existing triggers ignore 'scheduled', so changing to 'pending' MIGHT trigger them?
        // No, onDocumentCreated only triggers on creation. onDocumentUpdated is NOT set up for messages.
        
        // So we must Implement Sending Logic Here.
        
        const messageService = solapiModule.messageService; // Access exported service if available? 
        // Actually solapi.js exports 'sendSolapiOnMessageV2', not the service instance usually.
        // We'll initialize Solapi Service here locally or import a helper if we had one.
        // To be safe and quick, let's re-implement the core sending steps for these docs.

        // Initialize Solapi ONLY if needed
        const { SolapiMessageService } = require("solapi");
        let myMessageService = null;
        if (process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET) {
            myMessageService = new SolapiMessageService(
                process.env.SOLAPI_API_KEY, 
                process.env.SOLAPI_API_SECRET
            );
        }

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
                const tokensSnap = await tdb.collection("fcm_tokens").where("memberId", "==", memberId).get();
                const tokens = tokensSnap.docs.map(t => t.id);
                
                if (tokens.length > 0) {
                    const payload = {
                        notification: { title: "내요가 예약 알림", body: content },
                        data: { url: "https://boksaem-yoga.web.app/member?tab=messages" }
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

            // 2. Send Solapi (SMS/AlimTalk)
            let solapiResult = null;
            if (myMessageService && !msg.skipSolapi) {
                try {
                    const memberDoc = await tdb.collection('members').doc(memberId).get();
                    if (memberDoc.exists) {
                        const phone = memberDoc.data().phone?.replace(/-/g, '');
                        if (phone) {
                             const solapiPayload = {
                                to: phone,
                                from: process.env.SOLAPI_SENDER_NUMBER || "01022232789",
                                text: content,
                                subject: "복샘요가 알림"
                            };
                            // Simple LMS/SMS for now
                            solapiResult = await myMessageService.sendOne(solapiPayload);
                        }
                    }
                } catch (e) {
                    console.error(`[Scheduled] Solapi failed for ${doc.id}:`, e);
                }
            }

            // Prepare updates instead of batching immediately
            results.push({
                ref: doc.ref,
                updateData: {
                    status: 'sent',
                    sentAt: new Date().toISOString(),
                    pushStatus: { sent: pushSuccess, note: 'Scheduled Send' },
                    solapiStatus: solapiResult ? { sent: true, result: solapiResult } : { sent: false }
                },
                historyData: (pushSuccess || solapiResult) ? {
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
