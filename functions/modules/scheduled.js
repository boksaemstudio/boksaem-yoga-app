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
const { admin, tenantDb, STUDIO_ID, getAI, createPendingApproval, logAIError, getKSTDateString, getStudioName, getAllFCMTokens } = require("../helpers/common");
const { getStudioUrl } = require('../helpers/urls');
const chunk = require('lodash/chunk');

// [TEMP] 안면인식 확인용
exports.checkFaceInfo = onRequest({ region: "asia-northeast3" }, async (req, res) => {
    try {
        const tdb = tenantDb(STUDIO_ID); // 환경변수 STUDIO_ID 기반 동적 해석
        const snap = await tdb.collection('members').get();
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
    const tdb = tenantDb(event.params.studioId);

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
            const studioName = await getStudioName(event.params.studioId);
            await createPendingApproval('low_credits', [memberId], `${studioName} 알림`, body, { credits: 0, prevCredits: oldData.credits }, event.params.studioId);
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
    const tdb = tenantDb(STUDIO_ID);
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

        const studioName = await getStudioName(STUDIO_ID);
        const reportBody = `[${studioName} 일일 리포트] ${todayStr}

[출석 / 가입]
- 오늘 출석: ${attendanceCount} 명
- 신규 가입: ${registrationCount} 명

[보안 / 데이터]
- 크레딧 오류: ${anomalyCount}건 ${anomalyCount > 0 ? '⚠️' : '✅'}
- 유령 토큰: ${ghostCount}건 ${ghostCount > 5 ? '⚠️' : '✅'}

오늘 하루도 수고 많으셨습니다. 🙏`;

        // [ROOT FIX] roles 배열 + role 단일필드 모두 검색 (원장 토큰 role 덮어쓰기 방어)
        const { tokens } = await getAllFCMTokens(null, { role: 'admin', studioId: STUDIO_ID });
        if (tokens.length > 0) {
            // [ROOT FIX] data-only 패턴으로 통일 — SW가 일관되게 처리
            await admin.messaging().sendEachForMulticast({
                tokens,
                data: { 
                    title: "📊 일일 리포트", 
                    body: reportBody.substring(0, 200),
                    url: '/admin',
                    fullReport: reportBody
                },
                webpush: { headers: { Urgency: 'high' } },
                android: { priority: 'high' }
            });

            // [PERF] 보안 이상 확인
            if (anomalyCount > 0 || ghostCount > 10) {
                const securityMessage = `[긴급 보안 알림] 크레딧 오류: ${anomalyCount}건, 유령 토큰: ${ghostCount}건 - 확인이 필요합니다.`;
                await admin.messaging().sendEachForMulticast({
                    tokens,
                    data: { 
                        title: "🚨 보안 알림", 
                        body: securityMessage,
                        url: '/admin'
                    },
                    webpush: { headers: { Urgency: 'high' } },
                    android: { priority: 'high' }
                });
            }
        }

    } catch (error) {
        console.error("Daily report failed:", error);
        await logAIError('DailyReport', error, STUDIO_ID);
    }
});

/**
 * 예약 메시지 발송 (매 10분마다 실행)
 */
exports.sendScheduledMessages = onSchedule({
    schedule: "*/10 * * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    vpcConnector: "passflow-vpc",
    vpcConnectorEgressSettings: "ALL_TRAFFIC"
}, async (event) => {
    const tdb = tenantDb(STUDIO_ID);
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

        // [FIX] 알리고 전환: sms.js 모듈의 sendSMS 사용
        const { sendSMS } = require('./sms');
        const hasAligo = true; // Aligo 설정은 getAligoConfig()에서 처리되므로 우회

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
                            const smsStudioName = await getStudioName(STUDIO_ID);
                            smsResult = await sendSMS(phone, content, `${smsStudioName} 알림`, undefined, STUDIO_ID);
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
    schedule: "0 7,17 * * *",
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

/**
 * 라이브 데모 활동 주입 (KST 매 1분마다 실행)
 * 일회성이 아닌 매 순간 데모 환경이 살아있도록 예약/출석/매출 활동을 주입합니다.
 */
exports.injectLiveDemoActivity = onSchedule({
    schedule: "* * * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    vpcConnector: "passflow-vpc",
    vpcConnectorEgressSettings: "ALL_TRAFFIC"
}, async (event) => {
    try {
        const { injectLiveActivity } = require('../helpers/liveInjector');
        await injectLiveActivity();
    } catch (e) {
        console.error('[Scheduled] injectLiveActivity failed:', e);
    }
});

/**
 * 자동 홀딩 만료 (매일 KST 01:00)
 * 관리자가 정한 최대 홀딩 일수(holdRequestedDays)가 초과되었는데도 회원이 출석하지 않는 경우,
 * 무기한 홀딩 상태로 방치되지 않도록 자동으로 홀딩을 해제합니다.
 */
exports.autoExpireHoldsV2 = onSchedule({
    schedule: "0 1 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3"
}, async (event) => {
    const { tenantDb, getKSTDateString } = require("../helpers/common");
    const { processHoldRelease } = require("./attendance/coreLogic");
    const tdb = tenantDb(STUDIO_ID); // 테넌트 동적 로드
    
    try {
        console.log(`[Scheduled] Checking for expired holds at ${new Date().toISOString()}`);
        const snapshot = await tdb.collection('members').where('holdStatus', '==', 'holding').get();
        if (snapshot.empty) return;

        const todayStr = getKSTDateString(new Date());
        const timestampISO = new Date().toISOString();
        const batch = tdb.raw().batch();
        let releaseCount = 0;

        snapshot.docs.forEach(doc => {
            const memberData = doc.data();
            if (!memberData.holdRequestedDays || !memberData.holdStartDate) return;

            const holdStart = new Date(memberData.holdStartDate + 'T00:00:00+09:00');
            const todayDate = new Date(todayStr + 'T00:00:00+09:00');
            const daysElapsed = Math.round((todayDate - holdStart) / (1000 * 60 * 60 * 24));

            // 경과된 일수가 한도(requestedDays)에 도달했거나 초과했다면 (출석 없이 30일이 지난 경우 등) 자동 릴리즈
            if (daysElapsed >= memberData.holdRequestedDays) {
                // coreLogic.js의 processHoldRelease는 Math.min 처리를 포함해 자동으로 최대 연장일수(requestedDays)를 적용함.
                const { holdReleased, holdUpdates } = processHoldRelease(memberData, todayStr, timestampISO);
                if (holdReleased) {
                    const updateData = { 
                        ...holdUpdates, 
                        endDate: memberData.endDate // 연장된 endDate 반영
                    };
                    batch.update(doc.ref, updateData);
                    releaseCount++;
                }
            }
        });

        if (releaseCount > 0) {
            await batch.commit();
            console.log(`[Scheduled] Auto-released ${releaseCount} holds that reached their maximum duration.`);
        }
    } catch (e) {
        console.error("[Scheduled] autoExpireHoldsV2 failed:", e);
    }
});
