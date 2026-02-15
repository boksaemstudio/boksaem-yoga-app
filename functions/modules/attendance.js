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
            
            // [FIX] Validating '자율수련': Server-side fallback matching
            // If client sent '자율수련' (or nothing), try to match with actual schedule
            let finalClassTitle = classTitle;
            let finalInstructor = instructor;

            if (!classTitle || classTitle === '자율수련') {
                try {
                    const schedDocRef = db.collection('daily_classes').doc(`${branchId}_${today}`);
                    // Use transaction read if possible, but reading outside transaction is also safer for complexity? 
                    // Actually, we are inside a transaction. We MUST use transaction.get()!
                    const schedSnap = await transaction.get(schedDocRef);
                    
                    if (schedSnap.exists) {
                        const classes = (schedSnap.data().classes || []).filter(c => c.status !== 'cancelled');
                        const now = new Date();
                        // Calculate KST minutes
                        // We need a robust way to get KST time from 'now' (UTC/Server time)
                        // 'now' is a Date object. formatting it to KST.
                        const kstString = now.toLocaleString('en-US', { timeZone: 'Asia/Seoul', hour12: false, hour: '2-digit', minute: '2-digit' });
                        // kstString is "HH:mm" (e.g. "18:35")
                        const [kstH, kstM] = kstString.split(':').map(Number);
                        const currentMin = kstH * 60 + kstM;

                        // Match: 60 mins before ~ 30 mins after
                        const matched = classes.find(cls => {
                             const [h, m] = cls.time.split(':').map(Number);
                             const start = h * 60 + m;
                             const end = start + (cls.duration || 60);
                             return currentMin >= start - 60 && currentMin <= end + 30;
                        });

                        if (matched) {
                            finalClassTitle = matched.title || matched.className || classTitle;
                            finalInstructor = matched.instructor || instructor;
                            console.log(`[Attendance] Server-side matched: ${finalClassTitle} (${finalInstructor}) for ${memberId}`);
                        }
                    }
                } catch (schedErr) {
                    console.warn("[Attendance] Server-side schedule match failed:", schedErr);
                }
            }
            
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
                className: finalClassTitle || '자율수련',
                instructor: finalInstructor || '미지정',
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

/**
 * 오프라인 출석 자동 동기화 트리거
 * pending_attendance 컬렉션에 새 문서가 생성되면 실행되어 실제 출석으로 처리합니다.
 */
exports.onPendingAttendanceCreated = onDocumentCreated({
    document: "pending_attendance/{id}",
    region: "asia-northeast3"
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const { memberId, branchId, classTitle, instructor, timestamp, date } = data;
    const db = admin.firestore();

    console.log(`[OfflineSync] Processing pending check-in for member: ${memberId}`);

    try {
        await db.runTransaction(async (transaction) => {
            const memberRef = db.collection('members').doc(memberId);
            const memberSnap = await transaction.get(memberRef);

            if (!memberSnap.exists) return;

            const memberData = memberSnap.data();
            const currentCredits = memberData.credits || 0;
            const currentCount = memberData.attendanceCount || 0;

            // 1. Create Official Attendance Record
            // Note: We use the original timestamp from the client for accuracy
            const attendanceData = {
                memberId,
                memberName: memberData.name,
                branchId,
                date: date,
                className: classTitle || '자율수련',
                instructor: instructor || '미지정',
                timestamp: timestamp,
                status: 'valid',
                credits: currentCredits - 1,
                cumulativeCount: currentCount + 1,
                syncMode: 'offline-restored'
            };

            const attRef = db.collection('attendance').doc();
            transaction.set(attRef, attendanceData);

            // 2. Clear Member Credits & Increment Count
            transaction.update(memberRef, {
                credits: admin.firestore.FieldValue.increment(-1),
                attendanceCount: admin.firestore.FieldValue.increment(1),
                lastAttendance: timestamp
            });

            // 3. Mark Pending Record as Processed
            transaction.delete(snapshot.ref);
        });

        console.log(`[OfflineSync] Successfully synced offline check-in for ${memberId}`);
    } catch (e) {
        console.error(`[OfflineSync] Sync failed for ${memberId}:`, e);
    }
});
