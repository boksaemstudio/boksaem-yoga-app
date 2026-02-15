/**
 * Attendance Module
 * 출석 관련 Cloud Functions
 * 
 * @module modules/attendance
 * [Refactor] Extracted from index.js
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { admin, logAIError } = require("../helpers/common");

// Helper functions
const calculateGap = (lastDate, currentDate) => {
    if (!lastDate) return 999;
    const last = new Date(lastDate);
    const current = new Date(currentDate);
    return Math.floor((current - last) / (1000 * 60 * 60 * 24));
};

const calculateStreak = (records, currentDate) => {
    if (!records || records.length === 0) return 1;
    const dates = records.map(r => r.date).filter(Boolean).sort().reverse();
    let streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
        const gap = calculateGap(dates[i + 1], dates[i]);
        if (gap === 1) streak++;
        else break;
    }
    return streak;
};

const getTimeBand = (timestamp) => {
    const hour = new Date(timestamp).getHours();
    if (hour < 9) return 'early';
    if (hour < 12) return 'morning';
    if (hour < 15) return 'afternoon';
    if (hour < 18) return 'evening';
    return 'night';
};

const getMostCommon = (arr) => {
    if (!arr || arr.length === 0) return null;
    const counts = {};
    arr.forEach(item => { counts[item] = (counts[item] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

const generateEventMessage = (eventType, context) => {
    const messages = {
        'FLOW_MAINTAINED': '꾸준한 수련이 이어지고 있어요!',
        'GAP_DETECTED': '다시 돌아오셔서 반가워요!',
        'FLOW_RESUMED': '오랜만에 오셨네요. 환영합니다!',
        'PATTERN_SHIFTED': `수련 시간대가 ${context.shiftDetails}로 변경되었네요.`,
        'MILESTONE': `${context.milestone}회 출석 달성! 축하드려요!`
    };
    return messages[eventType] || '오늘도 수련을 위해 오셨군요!';
};

/**
 * 회원 출석 처리
 */
exports.checkInMemberV2Call = onCall({ 
    cors: ['https://boksaem-yoga.web.app', 'https://boksaem-yoga.firebaseapp.com', 'http://localhost:5173'],
    minInstances: 0
}, async (request) => {
    if (request.data.ping) {
        return { success: true, message: 'pong', timestamp: Date.now() };
    }

    const { memberId, branchId, classTitle, instructor } = request.data;
    const db = admin.firestore();

    if (!memberId || !branchId) {
        throw new HttpsError('invalid-argument', '회원 ID와 지점 ID가 필요합니다.');
    }

    try {
        return await db.runTransaction(async (transaction) => {
            const memberRef = db.collection('members').doc(memberId);
            const memberSnap = await transaction.get(memberRef);
            
            if (!memberSnap.exists) {
                throw new HttpsError('not-found', '회원을 찾을 수 없습니다.');
            }

            const memberData = memberSnap.data();
            
            // [CRITICAL] Check for Duplicates (Idempotency) inside Transaction
            // Same member, same date, within last 5 minutes = Duplicate
            const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

            // Note: We can't do complex queries inside transaction easily without index, 
            // but we can query by ID if we had a deterministic ID. 
            // Since we don't, we'll do a query. Firestore allows reads before writes.
            const duplicateQuery = db.collection('attendance')
                .where('memberId', '==', memberId)
                .where('date', '==', today)
                .where('timestamp', '>=', fiveMinutesAgo);
            
            const duplicateSnap = await transaction.get(duplicateQuery);
            
            if (!duplicateSnap.empty) {
                // If duplicate found, return the EXISTING success response (Idempotent)
                const existing = duplicateSnap.docs[0].data();
                console.log(`[Attendance] Duplicate check-in blocked for ${memberId}`);
                return {
                    success: true,
                    message: '이미 출석 처리되었습니다.',
                    attendanceStatus: existing.status,
                    newCredits: memberData.credits,
                    attendanceCount: memberData.attendanceCount,
                    isDuplicate: true
                };
            }

            // --- Normal Logic starts here ---
            const currentCredits = memberData.credits || 0;
            const currentCount = memberData.attendanceCount || 0;
            
            let attendanceStatus = 'valid';
            let denialReason = null;

            // 1. Check Expiration
            if (memberData.endDate) {
                const todayDate = new Date(today);
                const endDate = new Date(memberData.endDate);
                if (todayDate > endDate) {
                    attendanceStatus = 'denied';
                    denialReason = 'expired';
                }
            }

            const safeCredits = Number.isFinite(currentCredits) ? currentCredits : 0;

            // 2. Check Credits
            if (attendanceStatus === 'valid' && safeCredits <= 0) {
                attendanceStatus = 'denied';
                denialReason = 'no_credits';
            }

            // Get Recent Attendance for Streak (Non-transactional read is okay for this, or execute outside)
            // Ideally we should do this query. For simplicity and limit, we do it here.
            // Transaction requires all reads before writes.
            const recentSnap = await transaction.get(
                db.collection('attendance')
                    .where('memberId', '==', memberId)
                    .orderBy('timestamp', 'desc')
                    .limit(30)
            );

            // Calculate Multi-session status based on TODAY's records (excluding the one we just checked for dupes)
            // We already queried for duplicates (last 5 mins). Now we need ALL today's records for session count.
            // We can reuse the duplicate query if we widen it, but for simplicity let's stick to logic.
            // Actually, to get session count, we need all records for today.
            const todaySnap = await transaction.get(
                db.collection('attendance')
                    .where('memberId', '==', memberId)
                    .where('date', '==', today)
            );
            
            const isMultiSession = !todaySnap.empty;
            const sessionCount = isMultiSession ? todaySnap.size + 1 : 1;

            const attendanceData = {
                memberId,
                memberName: memberData.name, 
                branchId,
                date: today,
                className: classTitle || '자율수련',
                instructor: instructor || '미지정',
                timestamp: now.toISOString(),
                sessionNumber: sessionCount,
                status: attendanceStatus
            };

            if (denialReason) attendanceData.denialReason = denialReason;

            attendanceData.credits = attendanceStatus === 'valid' ? safeCredits - 1 : safeCredits;
            attendanceData.startDate = memberData.startDate;
            attendanceData.endDate = memberData.endDate;
            attendanceData.cumulativeCount = attendanceStatus === 'valid' ? currentCount + 1 : currentCount;

            const newAttRef = db.collection('attendance').doc();
            transaction.set(newAttRef, attendanceData);

            let newCredits = safeCredits;
            let newCount = currentCount;
            let streak = memberData.streak || 0;
            let startDate = memberData.startDate;
            let endDate = memberData.endDate;

            if (attendanceStatus === 'valid') {
                newCredits = safeCredits - 1;
                newCount = currentCount + 1;
                
                const records = recentSnap.docs.map(d => d.data()).filter(r => r.status === 'valid');
                streak = calculateStreak(records, today);
                if (!Number.isFinite(streak)) streak = 1;

                if (startDate === 'TBD' || !startDate || !memberData.endDate) {
                    startDate = today;
                    const end = new Date();
                    end.setDate(end.getDate() + 30);
                    endDate = end.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                }

                transaction.update(memberRef, {
                    credits: newCredits,
                    attendanceCount: newCount,
                    streak: streak,
                    startDate: startDate,
                    endDate: endDate,
                    lastAttendance: now.toISOString()
                });
            } else {
                 console.log(`[Attendance] Denied check-in for ${memberId}: ${denialReason}`);
            }

            return {
                success: true,
                attendanceStatus,
                denialReason,
                newCredits,
                attendanceCount: newCount,
                streak,
                startDate,
                endDate,
                memberName: memberData.name,
                isMultiSession,
                sessionCount
            };
        });

    } catch (error) {
        if (error.code) throw error;
        throw new HttpsError('internal', error.message);
    }
});

/**
 * 출석 생성 시 분석 이벤트 트리거
 */
exports.onAttendanceCreated = onDocumentCreated("attendance/{attendanceId}", async (event) => {
    const attendance = event.data.data();
    const memberId = attendance.memberId;
    const currentDate = attendance.date;
    if (!memberId || !currentDate) return;
    
    const db = admin.firestore();

    try {
        // Get recent attendance for analysis
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDate = thirtyDaysAgo.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

        const recentSnap = await db.collection('attendance')
            .where('memberId', '==', memberId)
            .where('date', '>=', cutoffDate)
            .orderBy('date', 'desc')
            .limit(30)
            .get();

        const records = recentSnap.docs.map(d => d.data());
        const timeBands = records.map(r => getTimeBand(r.timestamp)).filter(Boolean);
        const mostCommonBand = getMostCommon(timeBands);
        const timeBand = getTimeBand(attendance.timestamp);

        // Determine event type
        let eventType = "FLOW_MAINTAINED";
        const lastRecord = records.length > 1 ? records[1] : null;
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

        await db.collection('practice_events').add({
            memberId, eventType, date: currentDate, context, displayMessage: messages
        });

        // Send push to instructor
        const instructorName = attendance.instructor;
        if (instructorName) {
            try {
                const instructorTokensSnap = await db.collection('fcm_tokens')
                    .where('role', '==', 'instructor')
                    .where('instructorName', '==', instructorName)
                    .get();

                if (!instructorTokensSnap.empty) {
                    const memberName = attendance.memberName || '회원';
                    const className = attendance.className || '수업';

                    const tokens = instructorTokensSnap.docs.map(doc => doc.data().token).filter(Boolean);
                    
                    // [NEW] Get Member Rank Label (신규, 2회차, 3회차)
                    let rankLabel = '';
                    const totalCount = attendance.cumulativeCount || 0;
                    if (totalCount === 1) rankLabel = ' [신규]';
                    else if (totalCount >= 2 && totalCount <= 3) {
                        rankLabel = ` [${totalCount}회차]`;
                    }

                    // Prepare message details
                    let body = `${memberName}님이 출석하셨습니다.`;
                    if (attendance.credits !== undefined || attendance.endDate) {
                        const credits = attendance.credits !== undefined ? `${attendance.credits}회 남음` : '';
                        const expiry = attendance.endDate ? `(~${attendance.endDate.slice(2)})` : '';
                        body = `${className} | ${credits} ${expiry}`;
                    }

                    for (const token of tokens) {
                        try {
                            await admin.messaging().send({
                                token,
                                notification: {
                                    title: `🧘‍♀️ ${memberName}${rankLabel}님 출석`,
                                    body: body
                                },
                                webpush: { 
                                    notification: { 
                                        icon: 'https://boksaem-yoga.web.app/logo_circle.png',
                                        badge: 'https://boksaem-yoga.web.app/logo_circle.png'
                                    },
                                    fcm_options: { link: 'https://boksaem-yoga.web.app/instructor' }
                                }
                            });
                        } catch (sendError) {
                            if (sendError.code === 'messaging/invalid-registration-token') {
                                await db.collection('fcm_tokens').doc(token).delete();
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
