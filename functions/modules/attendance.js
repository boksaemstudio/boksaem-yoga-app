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
    cors: ['https://boksaem-yoga.web.app', 'https://boksaem-yoga.firebaseapp.com']
}, async (request) => {
    const { memberId, branchId, classTitle, instructor } = request.data;
    const db = admin.firestore();

    if (!memberId || !branchId) {
        throw new HttpsError('invalid-argument', '회원 ID와 지점 ID가 필요합니다.');
    }

    try {
        const memberRef = db.collection('members').doc(memberId);
        const memberSnap = await memberRef.get();
        
        if (!memberSnap.exists) {
            throw new HttpsError('not-found', '회원을 찾을 수 없습니다.');
        }

        const memberData = memberSnap.data();
        const currentCredits = memberData.credits || 0;
        const currentCount = memberData.attendanceCount || 0;
        
        if (currentCredits <= 0) {
            throw new HttpsError('failed-precondition', '잔여 수업권이 없습니다.');
        }

        // Check for duplicate check-in today
        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const existingSnap = await db.collection('attendance')
            .where('memberId', '==', memberId)
            .where('date', '==', today)
            .where('className', '==', classTitle)
            .limit(1)
            .get();

        const isMultiSession = !existingSnap.empty;
        const sessionCount = isMultiSession ? existingSnap.size + 1 : 1;

        // Create attendance record
        await db.collection('attendance').add({
            memberId,
            branchId,
            date: today,
            className: classTitle || '자율수련',
            instructor: instructor || '관리자',
            timestamp: new Date().toISOString(),
            sessionNumber: sessionCount
        });

        // Update member stats
        const newCredits = currentCredits - 1;
        const newCount = currentCount + 1;
        
        // Calculate streak
        const recentAttendance = await db.collection('attendance')
            .where('memberId', '==', memberId)
            .orderBy('timestamp', 'desc')
            .limit(30)
            .get();
        const records = recentAttendance.docs.map(d => d.data());
        const streak = calculateStreak(records, today);

        // Handle TBD dates
        let startDate = memberData.startDate;
        let endDate = memberData.endDate;
        
        if (startDate === 'TBD' || !startDate) {
            startDate = today;
            // Calculate end date based on typical membership (30 days)
            const end = new Date();
            end.setDate(end.getDate() + 30);
            endDate = end.toISOString().split('T')[0];
        }

        await memberRef.update({
            credits: newCredits,
            attendanceCount: newCount,
            streak: streak,
            startDate: startDate,
            endDate: endDate,
            lastAttendance: new Date().toISOString()
        });

        return {
            success: true,
            newCredits,
            attendanceCount: newCount,
            streak,
            startDate,
            endDate,
            memberName: memberData.name,
            isMultiSession,
            sessionCount
        };

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
        const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

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
                    for (const token of tokens) {
                        try {
                            await admin.messaging().send({
                                token,
                                notification: {
                                    title: `${className} 출석`,
                                    body: `${memberName}님이 출석하셨습니다.`
                                },
                                webpush: { notification: { icon: '/logo_circle.png' } }
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
