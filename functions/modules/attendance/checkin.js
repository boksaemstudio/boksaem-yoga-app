/**
 * 키오스크 체크인 Cloud Function
 * 
 * [DRY Refactor] 비즈니스 로직은 coreLogic.js에 위임.
 * 이 파일의 책임: 키오스크 전용 관심사 (중복 체크, 수업 매칭, 주간/일간 제한, rate limit)
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin, tenantDb, getKSTDateString } = require("../../helpers/common");
const { processAttendanceCore } = require('./coreLogic');

exports.checkInMemberV2Call = onCall({ 
    cors: require('../../helpers/cors').ALLOWED_ORIGINS,
    minInstances: 0
}, async (request) => {
    if (request.data.ping) {
        return { success: true, message: 'pong', timestamp: Date.now() };
    }

    const { memberId, branchId, classTitle, instructor, classTime, force, eventId, source } = request.data;
    const tdb = tenantDb();

    console.log(`[Attendance] Check-in request for ${memberId} in ${branchId}. Force: ${force}, EventId: ${eventId}`);

    if (!memberId || !branchId) {
        throw new HttpsError('invalid-argument', '회원 ID와 지점 ID가 필요합니다.');
    }

    try {
        return await tdb.raw().runTransaction(async (transaction) => {
            const today = getKSTDateString(new Date());
            const now = new Date();

            // ━━━━ 0. 서버단 안면인식 차단 (프론트만 믿지 않음) ━━━━
            if (source === 'facial') {
                const configDocForFace = await transaction.get(tdb.collection('config').doc('settings'));
                const studioConfig = configDocForFace.exists ? configDocForFace.data() : {};
                
                // Firestore의 POLICIES도 체크 (studio 문서 레벨)
                const studioDocForFace = await transaction.get(tdb.raw().collection('studios').doc(tdb._studioId));
                const studioData = studioDocForFace.exists ? studioDocForFace.data() : {};
                
                const faceEnabledConfig = studioConfig.POLICIES?.FACE_RECOGNITION_ENABLED === true;
                const faceEnabledStudio = studioData.POLICIES?.FACE_RECOGNITION_ENABLED === true;
                
                if (!faceEnabledConfig && !faceEnabledStudio) {
                    console.log(`[Attendance] ❌ BLOCKED: 안면인식 출석 요청 거부 (서버단 정책: OFF). memberId=${memberId}`);
                    throw new HttpsError('permission-denied', '안면인식 출석이 비활성화되어 있습니다. 키패드를 사용해주세요.');
                }
            }

            // ━━━━ 1. Duplicate Check (UUID Idempotency) ━━━━
            if (!force && eventId) {
                const duplicateQuery = tdb.collection('attendance')
                    .where('memberId', '==', memberId)
                    .where('date', '==', today)
                    .where('eventId', '==', eventId)
                    .limit(1);
                
                const duplicateSnap = await transaction.get(duplicateQuery);
                
                if (!duplicateSnap.empty) {
                    const existingDoc = duplicateSnap.docs[0];
                    const existing = existingDoc.data();
                    const memberSnap = await transaction.get(tdb.collection('members').doc(memberId));
                    const memberData = memberSnap.exists ? memberSnap.data() : {};
                    console.log(`[Attendance] Duplicate check-in blocked for ${memberId} (EventId: ${eventId})`);
                    return {
                        success: true, message: '이미 출석 처리되었습니다.',
                        attendanceStatus: existing.status, attendanceId: existingDoc.id,
                        newCredits: memberData.credits, attendanceCount: memberData.attendanceCount,
                        memberName: memberData.name, startDate: memberData.startDate, endDate: memberData.endDate,
                        streak: memberData.streak || 0, isDuplicate: true
                    };
                }
            } else {
                console.log(`[Attendance] Force Check-in or No EventId for ${memberId}. Skipping deduplication.`);
            }

            // ━━━━ 2. Server-side Class Matching ━━━━
            let finalClassTitle = classTitle;
            let finalInstructor = instructor;
            let matchedTime = classTime;
            
            const nowTime = new Date();
            const kstTime = new Date(nowTime.getTime() + (9 * 60 * 60 * 1000));
            const kstH = kstTime.getUTCHours();
            const kstM = kstTime.getUTCMinutes();
            const kstString = `${String(kstH).padStart(2, '0')}:${String(kstM).padStart(2, '0')}`;
            const currentMin = kstH * 60 + kstM;

            if (!classTitle || classTitle === '자율수련') {
                try {
                    const schedDocRef = tdb.collection('daily_classes').doc(`${branchId}_${today}`);
                    const schedSnap = await transaction.get(schedDocRef);
                    
                    if (schedSnap.exists) {
                        const classes = (schedSnap.data().classes || []).filter(c => c.status !== 'cancelled');
                        let bestMatch = null;
                        let smallestDiff = Infinity;
                        for (const cls of classes) {
                             const [h, m] = cls.time.split(':').map(Number);
                             const start = h * 60 + m;
                             const diff = Math.abs(currentMin - start);
                             if (diff < smallestDiff) {
                                 smallestDiff = diff;
                                 bestMatch = cls;
                             }
                        }
                        const matchedCls = bestMatch;

                        if (matchedCls) {
                             finalClassTitle = matchedCls.title || matchedCls.className || classTitle;
                             finalInstructor = matchedCls.instructor || instructor;
                             matchedTime = matchedCls.time;
                             console.log(`[Attendance] Server-side matched: ${finalClassTitle} (${finalInstructor}) for ${memberId}`);
                        } else {
                             finalClassTitle = '자율수련';
                             finalInstructor = '회원';
                             matchedTime = kstString;
                        }
                    } else {
                         finalClassTitle = '자율수련';
                         finalInstructor = '회원';
                         matchedTime = kstString;
                    }
                } catch (schedErr) {
                    console.warn("[Attendance] Server-side schedule match failed:", schedErr);
                    finalClassTitle = '자율수련';
                    finalInstructor = '회원';
                    matchedTime = kstString;
                }
            }

            // ━━━━ 3. Weekly/Daily Credit Limit (키오스크 전용) ━━━━
            // coreLogic은 기본 만료/횟수만 검사. 주간/일간 제한은 키오스크 전용 정책.
            let preDenied = false;
            let preDenialReason = null;

            const memberSnapPre = await transaction.get(tdb.collection('members').doc(memberId));
            if (memberSnapPre.exists) {
                const mData = memberSnapPre.data();
                const configDoc = await transaction.get(tdb.collection('config').doc('settings'));
                const studioConfig = configDoc.exists ? configDoc.data() : {};
                const creditRules = studioConfig.POLICIES?.CREDIT_RULES || { mode: 'total' };
                const sessionsPerWeek = mData.sessionsPerWeek || 0;

                if (creditRules.mode === 'weekly' && sessionsPerWeek > 0) {
                    const creditPolicyUtils = require('../../utils/creditPolicyUtils');
                    const { weekStart, weekEnd } = creditPolicyUtils.getWeekBoundary(today, creditRules.weeklyResetDay || 1);
                    const weeklySnap = await transaction.get(
                        tdb.collection('attendance')
                            .where('memberId', '==', memberId)
                            .where('date', '>=', weekStart)
                            .where('date', '<=', weekEnd)
                            .where('status', '==', 'valid')
                    );
                    if (weeklySnap.size >= sessionsPerWeek) {
                        preDenied = true;
                        preDenialReason = 'weekly_limit';
                        console.log(`[Attendance] Weekly limit reached for ${memberId}: ${weeklySnap.size}/${sessionsPerWeek}`);
                    }
                } else if (creditRules.mode === 'daily') {
                    const sessionsPerDay = mData.sessionsPerDay || 0;
                    if (sessionsPerDay > 0) {
                        const dailySnap = await transaction.get(
                            tdb.collection('attendance')
                                .where('memberId', '==', memberId)
                                .where('date', '==', today)
                                .where('status', '==', 'valid')
                        );
                        if (dailySnap.size >= sessionsPerDay) {
                            preDenied = true;
                            preDenialReason = 'daily_limit';
                        }
                    }
                }
            }

            // ━━━━ 4. Core Logic 위임 ━━━━
            const result = await processAttendanceCore(transaction, {
                memberId, branchId,
                className: finalClassTitle,
                instructor: finalInstructor,
                classTime: matchedTime,
                dateStr: today,
                timestampISO: now.toISOString(),
                type: 'checkin',
                eventId,
                source: source || 'pin'
            }, {
                skipCreditDeduction: false,
                skipValidation: false
            });

            // 주간/일간 제한으로 거부된 경우 출석 상태 덮어쓰기
            if (preDenied && result.attendanceStatus === 'valid') {
                // coreLogic이 valid로 처리했지만, 주간/일간 제한에 걸림
                // 이 경우 출석 기록을 denied로 수정해야 함
                // NOTE: coreLogic이 이미 attendance 문서를 set했으므로 update로 변경
                const attRef = tdb.collection('attendance').doc(result.attendanceId);
                transaction.update(attRef, {
                    status: 'denied',
                    denialReason: preDenialReason,
                    className: `출석 거부 (${preDenialReason === 'weekly_limit' ? '주간 횟수 초과' : '일간 횟수 초과'})`,
                    credits: result.newCredits + 1 // 차감 취소
                });

                // 회원 크레딧도 차감 취소
                const memberRef = tdb.collection('members').doc(memberId);
                transaction.update(memberRef, {
                    credits: admin.firestore.FieldValue.increment(1),
                    attendanceCount: admin.firestore.FieldValue.increment(-1)
                });

                result.attendanceStatus = 'denied';
                result.denialReason = preDenialReason;
                result.newCredits = result.newCredits + 1;
                result.attendanceCount = result.attendanceCount - 1;
            }

            return result;
        });

    } catch (error) {
        if (error.code) throw error;
        throw new HttpsError('internal', error.message);
    }
});
