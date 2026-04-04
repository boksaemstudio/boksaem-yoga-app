/**
 * 출석 이벤트 분석 + 강사 푸시 알림
 * attendance 모듈에서 분리
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { admin, tenantDb, getKSTDateString, logAIError, getStudioName, getStudioLogoUrl } = require("../../helpers/common");
const { getStudioUrl } = require('../../helpers/urls');
const { calculateStreak, getTimeBand, getMostCommon, generateEventMessage } = require('./helpers');

exports.onAttendanceCreated = onDocumentCreated({
    document: `studios/{studioId}/attendance/{attendanceId}`,
    region: "asia-northeast3"
}, async (event) => {
    const attendance = event.data.data();
    const memberId = attendance.memberId;
    const currentDate = attendance.date;
    if (!memberId || !currentDate) return;
    
    const tdb = tenantDb(event.params.studioId);
    const currentStudioId = event.params.studioId;

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

        // ━━━━ Send push to instructor + admin (원장) ━━━━
        try {
            const { getAllFCMTokens } = require("../../helpers/common");
            const memberName = attendance.memberName || '회원';
            const className = attendance.className || '수업';
            
            let rankLabel = '';
            const totalCount = attendance.cumulativeCount || 0;
            if (totalCount === 1) rankLabel = ' [신규]';
            else if (totalCount >= 2 && totalCount <= 3) rankLabel = ` [${totalCount}회차]`;

            const studioName = await getStudioName(currentStudioId);
            const logoUrl = await getStudioLogoUrl(currentStudioId);
            let body = `${memberName}님이 출석하셨습니다.`;
            if (attendance.credits !== undefined || attendance.endDate) {
                const credits = attendance.credits !== undefined ? `${attendance.credits}회 남음` : '';
                const expiry = attendance.endDate ? `(~${attendance.endDate.slice(2)})` : '';
                body = `${className} | ${credits} ${expiry}`;
            }

            // [1] 강사에게 푸시
            const instructorName = attendance.instructor;
            if (instructorName) {
                const { tokens } = await getAllFCMTokens(null, { role: 'instructor', instructorName, studioId: currentStudioId });
                if (tokens.length > 0) {
                    console.log(`[Instructor Push] Sending to ${tokens.length} tokens for "${instructorName}"`);
                    for (const token of tokens) {
                        try {
                            await admin.messaging().send({
                                token,
                                // [ROOT FIX] data-only 메시지로 통일 → SW가 일관되게 처리
                                data: { 
                                    title: `🧘‍♀️ ${memberName}${rankLabel}님 출석`, 
                                    body: `${studioName} | ${body}`,
                                    icon: logoUrl || '',
                                    tag: `att-inst-${attendanceId}`,
                                    url: '/instructor'
                                },
                                webpush: { headers: { Urgency: 'high' } },
                                android: { priority: 'high' }
                            });
                        } catch (sendError) {
                            console.warn(`[Instructor Push] Send failed for token ${token.substring(0, 20)}...: ${sendError.code}`);
                            if (sendError.code === 'messaging/invalid-registration-token' || sendError.code === 'messaging/registration-token-not-registered') {
                                await tdb.collection('fcm_tokens').doc(token).delete().catch(() => {});
                            }
                        }
                    }
                } else {
                    console.warn(`[Attendance] ⚠️ 강사("${instructorName}")의 활성 푸시 토큰(로그인 기기)이 없어 강사 푸시 스킵됨!`);
                }
            } else {
                console.warn(`[Attendance] 🚨 수업에 배정된 담당 강사 이름이 없습니다! 강사 푸시 원천 차단됨! 로그 확인 요망.`);
            }

            // [2] 관리자(원장)에게 항상 독립적으로 푸시
            // [ROOT FIX] 중복 방지 로직 제거 — 원장이 강사를 겸할 때도
            //   서로 다른 tag를 사용하므로 기기에서 별도 알림으로 표시됨
            //   (같은 tag면 교체되므로 정보가 사라지는 문제 방지)
            const { tokens: adminTokens } = await getAllFCMTokens(null, { role: 'admin', studioId: currentStudioId });
            if (adminTokens.length === 0) {
                console.warn(`[Attendance] 🚨 활성화된 원장(admin) 푸시 토큰이 없어 원장님께 푸시를 발송하지 못했습니다!!`);
            }
            
            if (adminTokens.length > 0) {
                console.log(`[Admin Push] Sending attendance push to ${adminTokens.length} admin tokens`);
                for (const token of adminTokens) {
                    try {
                        await admin.messaging().send({
                            token,
                            // [ROOT FIX] data-only + 관리자 전용 tag
                            data: { 
                                title: `🧘‍♀️ ${memberName}${rankLabel}님 출석`, 
                                body: `${studioName} | ${body}`,
                                icon: logoUrl || '',
                                tag: `att-admin-${attendanceId}`,
                                url: '/admin'
                            },
                            webpush: { headers: { Urgency: 'high' } },
                            android: { priority: 'high' }
                        });
                    } catch (sendError) {
                        console.warn(`[Admin Push] Send failed for token ${token.substring(0, 20)}...: ${sendError.code}`);
                        if (sendError.code === 'messaging/invalid-registration-token' || sendError.code === 'messaging/registration-token-not-registered') {
                            await tdb.collection('fcm_tokens').doc(token).delete().catch(() => {});
                        }
                    }
                }
            }
        } catch (pushError) {
            console.error('[Attendance Push] Error:', pushError);
        }

        // ━━━━ Send push/SMS to MEMBER ━━━━
        // 무제한 회원(credits >= 999999)이 아닌 경우만
        const credits = attendance.credits;
        const isUnlimited = credits === undefined || credits >= 999999;
        
        if (!isUnlimited && attendance.status === 'valid') {
            try {
                const { getAllFCMTokens } = require("../../helpers/common");
                const memberName = attendance.memberName || '회원';
                const className = attendance.className || '수업';
                const endDate = attendance.endDate;
                const cumulativeCount = attendance.cumulativeCount || 0;
                const studioName = await getStudioName(currentStudioId);
                const logoUrl = await getStudioLogoUrl(currentStudioId);

                // 잔여일 계산
                let daysLeft = '';
                if (endDate && endDate !== 'TBD' && endDate !== 'unlimited') {
                    const today = new Date();
                    const end = new Date(endDate);
                    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
                    daysLeft = diff >= 0 ? `${diff}일 남음` : '기간 만료';
                }

                const title = `✅ ${memberName}님 출석 완료`;
                const parts = [];
                if (credits !== undefined) parts.push(`잔여 ${credits}회`);
                if (daysLeft) parts.push(daysLeft);
                if (endDate && endDate !== 'TBD' && endDate !== 'unlimited') parts.push(`~${endDate.slice(5)}`);
                const body = `${className} | ${parts.join(' • ')}`;

                // [1] 회원 앱 푸시 (무료)
                const { tokens: memberTokens } = await getAllFCMTokens(null, { memberId, studioId: currentStudioId });
                if (memberTokens.length > 0) {
                    console.log(`[Member Push] Sending attendance push to ${memberTokens.length} tokens for "${memberName}"`);
                    for (const token of memberTokens) {
                        try {
                            await admin.messaging().send({
                                token,
                                // [ROOT FIX] data-only 통일 — SW가 icon/badge/tag를 직접 제어
                                data: { 
                                    title, 
                                    body: `${studioName} | ${body}`,
                                    icon: logoUrl || '',
                                    tag: `member-att-${attendanceId}`,
                                    url: '/member'
                                },
                                webpush: { headers: { Urgency: 'high' } },
                                android: { priority: 'high' }
                            });
                        } catch (sendErr) {
                            if (sendErr.code === 'messaging/invalid-registration-token' || sendErr.code === 'messaging/registration-token-not-registered') {
                                await tdb.collection('fcm_tokens').doc(token).delete().catch(() => {});
                            }
                        }
                    }
                }

                // [2] 출석 SMS 알림 (회원 설정에 따라, 비용 발생)
                const memberDoc = await tdb.collection('members').doc(memberId).get();
                const memberSettings = memberDoc.exists ? memberDoc.data() : {};
                
                if (memberSettings.attendanceSmsEnabled) {
                    try {
                        const { sendSMS } = require('../sms');
                        const phone = memberSettings.phone;
                        if (phone) {
                            const smsBody = `[${studioName}] ${memberName}님 출석 확인\n${className} | ${parts.join(' | ')}\n${cumulativeCount > 0 ? `누적 ${cumulativeCount}회 출석` : ''}`;
                            await sendSMS(phone, smsBody, undefined, undefined, currentStudioId);
                            console.log(`[Member SMS] Attendance SMS sent to ${memberName} (${phone})`);
                        }
                    } catch (smsErr) {
                        console.error('[Member SMS] Error:', smsErr);
                    }
                }
            } catch (memberNotifError) {
                console.error('[Member Notification] Error:', memberNotifError);
            }
        }

    } catch (error) {
        await logAIError('PracticeEvent_Calculation', error);
    }
});
