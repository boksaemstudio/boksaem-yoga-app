/**
 * 출석 이벤트 분석 + 강사 푸시 알림
 * attendance 모듈에서 분리
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { admin, tenantDb, getKSTDateString, logAIError, getStudioName, getStudioLogoUrl } = require("../../helpers/common");
const { calculateStreak, getTimeBand, getMostCommon, generateEventMessage } = require('./helpers');

exports.onAttendanceCreated = onDocumentCreated({
    document: `studios/{studioId}/attendance/{attendanceId}`,
    region: "asia-northeast3"
}, async (event) => {
    const attendance = event.data.data();
    const memberId = attendance.memberId;
    const currentDate = attendance.date;
    if (!memberId || !currentDate) return;
    
    const tdb = tenantDb();

    try {
        const parts = currentDate.split('-').map(Number);
        const thirtyDaysAgo = new Date(parts[0], parts[1] - 1, parts[2]);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDate = getKSTDateString(thirtyDaysAgo);

        const recentSnap = await tdb.collection('attendance')
            .where('memberId', '==', memberId)
            .where('date', '>=', cutoffDate)
            .orderBy('date', 'desc')
            .limit(30)
            .get();

        const records = recentSnap.docs.map(d => d.data()).filter(r => r.status === 'valid');
        const timeBands = records.map(r => getTimeBand(r.timestamp)).filter(Boolean);
        const mostCommonBand = getMostCommon(timeBands);
        const timeBand = getTimeBand(attendance.timestamp);

        let eventType = "FLOW_MAINTAINED";
        const lastRecord = records.length > 1 ? records[1] : null;
        const { calculateGap } = require('./helpers');
        const gapDays = lastRecord ? calculateGap(lastRecord.date, currentDate) : 0;

        if (gapDays >= 7 && gapDays < 30) eventType = "GAP_DETECTED";
        else if (gapDays >= 30) eventType = "FLOW_RESUMED";

        const timeBandShifted = mostCommonBand && timeBand !== mostCommonBand;
        const context = { streak: calculateStreak(records, currentDate), shiftDetails: '' };
        
        if (timeBandShifted) {
            eventType = "PATTERN_SHIFTED";
            context.shiftDetails = `${mostCommonBand} → ${timeBand}`;
        }

        const messages = generateEventMessage(eventType, context);
        const attendanceId = event.params.attendanceId;
        await tdb.collection('practice_events').doc(attendanceId).set({
            memberId, eventType, date: currentDate, context, displayMessage: messages,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // ━━━━ Send push to instructor ━━━━
        const instructorName = attendance.instructor;
        if (instructorName) {
            try {
                const { getAllFCMTokens } = require("../../helpers/common");
                const { tokens, tokenSources } = await getAllFCMTokens(null, { role: 'instructor', instructorName });

                if (tokens.length > 0) {
                    const memberName = attendance.memberName || '회원';
                    const className = attendance.className || '수업';
                    
                    let rankLabel = '';
                    const totalCount = attendance.cumulativeCount || 0;
                    if (totalCount === 1) rankLabel = ' [신규]';
                    else if (totalCount >= 2 && totalCount <= 3) rankLabel = ` [${totalCount}회차]`;

                    const studioName = await getStudioName();
                    const logoUrl = await getStudioLogoUrl();
                    let body = `${memberName}님이 출석하셨습니다.`;
                    if (attendance.credits !== undefined || attendance.endDate) {
                        const credits = attendance.credits !== undefined ? `${attendance.credits}회 남음` : '';
                        const expiry = attendance.endDate ? `(~${attendance.endDate.slice(2)})` : '';
                        body = `${className} | ${credits} ${expiry}`;
                    }

                    console.log(`[Instructor Push] Sending to ${tokens.length} tokens for "${instructorName}"`);
                    for (const token of tokens) {
                        try {
                            await admin.messaging().send({
                                token,
                                notification: { title: `🧘‍♀️ ${memberName}${rankLabel}님 출석`, body: `${studioName} | ${body}` },
                                webpush: { 
                                    notification: { icon: logoUrl, badge: logoUrl, tag: `att-${attendanceId}` },
                                    fcm_options: { link: 'https://boksaem-yoga.web.app/instructor' }
                                }
                            });
                        } catch (sendError) {
                            console.warn(`[Instructor Push] Send failed for token ${token.substring(0, 20)}...: ${sendError.code}`);
                            if (sendError.code === 'messaging/invalid-registration-token' || sendError.code === 'messaging/registration-token-not-registered') {
                                await tdb.collection('fcm_tokens').doc(token).delete().catch(() => {});
                            }
                        }
                    }
                }
            } catch (instructorPushError) {
                console.error('[Instructor Push] Error:', instructorPushError);
            }
        }

    } catch (error) {
        await logAIError('PracticeEvent_Calculation', error);
    }
});
