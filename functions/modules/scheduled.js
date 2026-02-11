/**
 * Scheduled Jobs Module
 * 예약 작업 관련 Cloud Functions
 * 
 * @module modules/scheduled
 * [Refactor] Extracted from index.js
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { admin, getAI, createPendingApproval, logAIError } = require("../helpers/common");

/**
 * 크레딧 소진 알림
 */
exports.checkLowCreditsV2 = onDocumentUpdated({
    document: "members/{memberId}"
}, async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();
    const memberId = event.params.memberId;
    const db = admin.firestore();

    if (newData.credits === oldData.credits) return null;
    if (newData.credits !== 0 || newData.credits >= oldData.credits) return null;

    try {
        const attendanceSnap = await db.collection('attendance').where('memberId', '==', memberId).limit(10).get();
        const stats = attendanceSnap.docs.map(d => d.data().className).join(", ");
        const lang = newData.language || 'ko';
        const ai = getAI();
        
        const body = await ai.generate(`크레딧 소진 알림 (${ai.getLangName(lang)}): ${newData.name}님의 수업권이 모두 소진되었습니다. 수련 패턴: ${stats}`);

        const tokensSnap = await db.collection('fcm_tokens').where('memberId', '==', memberId).get();
        if (!tokensSnap.empty) {
            await createPendingApproval('low_credits', [memberId], "나의요가 알림", body, { credits: 0, prevCredits: oldData.credits });
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
    timeZone: "Asia/Seoul"
}, async (event) => {
    const db = admin.firestore();
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

    try {
        // Gather stats
        const [attendanceSnap, registrationSnap, anomalySnap, ghostSnap] = await Promise.all([
            db.collection('attendance').where('date', '==', todayStr).get(),
            db.collection('members').where('createdAt', '>=', `${todayStr}T00:00:00`).get(),
            db.collection('members').where('credits', '<', 0).get(),
            db.collection('fcm_tokens').where('updatedAt', '<', new Date(Date.now() - 60*24*60*60*1000).toISOString()).get()
        ]);

        const attendanceCount = attendanceSnap.size;
        const registrationCount = registrationSnap.size;
        const anomalyCount = anomalySnap.size;
        const ghostCount = ghostSnap.size;

        const reportBody = `[복샘요가 일일 리포트] ${todayStr}

[출석 / 가입]
- 오늘 출석: ${attendanceCount} 명
- 신규 가입: ${registrationCount} 명

[보안 / 데이터]
- 크레딧 오류: ${anomalyCount}건 ${anomalyCount > 0 ? '⚠️' : '✅'}
- 유령 토큰: ${ghostCount}건 ${ghostCount > 5 ? '⚠️' : '✅'}

오늘 하루도 수고 많으셨습니다. 🙏`;

        const tokensSnap = await db.collection('fcm_tokens').where('type', '==', 'admin').get();
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
