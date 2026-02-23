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
    // Deduplicate dates using Set to fix streak breaking on multi-session days
    const uniqueDates = Array.from(new Set(records.map(r => r.date).filter(Boolean)));
    const dates = uniqueDates.sort().reverse();
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

    const { memberId, branchId, classTitle, instructor, classTime } = request.data;
    const db = admin.firestore();

    // [DEBUG] Check force flag
    console.log(`[Attendance] Check-in request for ${memberId} in ${branchId}. Force: ${request.data.force}`);

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
            // Same member, same date, within last 15 seconds = Duplicate
            // [UX] If 'force' is provided (Member Confirmed Dual Check-in), SKIP this check completely
            if (!request.data.force) {
                const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                const now = new Date();
                
                const duplicateWindowSeconds = 15;
                const duplicateCutoff = new Date(now.getTime() - duplicateWindowSeconds * 1000).toISOString();
    
                const duplicateQuery = db.collection('attendance')
                    .where('memberId', '==', memberId)
                    .where('date', '==', today)
                    .where('timestamp', '>=', duplicateCutoff);
                
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
                        memberName: memberData.name,
                        startDate: memberData.startDate,
                        endDate: memberData.endDate,
                        streak: memberData.streak || 0,
                        isDuplicate: true
                    };
                }
            }


            // --- Normal Logic starts here ---
            
            // [FIX] Validating '자율수련': Server-side fallback matching
            let finalClassTitle = classTitle;
            let finalInstructor = instructor;
            let matched = null;

            if (!classTitle || classTitle === '자율수련') {
                try {
                    const schedDocRef = db.collection('daily_classes').doc(`${branchId}_${today}`);
                    const schedSnap = await transaction.get(schedDocRef);
                    
                    if (schedSnap.exists) {
                        const classes = (schedSnap.data().classes || []).filter(c => c.status !== 'cancelled');
                        const now = new Date();
                        const kstString = now.toLocaleString('en-US', { timeZone: 'Asia/Seoul', hour12: false, hour: '2-digit', minute: '2-digit' });
                        const [kstH, kstM] = kstString.split(':').map(Number);
                        const currentMin = kstH * 60 + kstM;

                        const matchedCls = classes.find(cls => {
                             const [h, m] = cls.time.split(':').map(Number);
                             const start = h * 60 + m;
                             const end = start + (cls.duration || 60);
                             return currentMin >= start - 60 && currentMin <= end + 30;
                        });

                        if (matchedCls) {
                             matched = matchedCls; // Use the outer 'matched' variable
                             finalClassTitle = matchedCls.title || matchedCls.className || classTitle;
                             finalInstructor = matchedCls.instructor || instructor;
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
                className: attendanceStatus === 'valid' ? (finalClassTitle || '자율수련') : `출석 거부 (${denialReason === 'expired' ? '기간 만료' : '횟수 부족'})`,
                instructor: finalInstructor || '미지정',
                timestamp: now.toISOString(),
                type: 'checkin',
                sessionNumber: sessionCount,
                status: attendanceStatus,
                classTime: classTime || matched?.time || null // [FIX] Use client provided time or server matched time
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
exports.onAttendanceCreated = onDocumentCreated({
    document: "attendance/{attendanceId}",
    region: "asia-northeast3"
}, async (event) => {
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
                            console.warn(`[Instructor Push] Send failed for token ${token.substring(0, 20)}...: ${sendError.code}`);
                            // Clean up invalid/expired/unregistered tokens
                            if (sendError.code === 'messaging/invalid-registration-token' ||
                                sendError.code === 'messaging/registration-token-not-registered') {
                                console.log(`[Instructor Push] Deleting stale token: ${token.substring(0, 20)}...`);
                                await db.collection('fcm_tokens').doc(token).delete().catch(() => {});
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

            const recentSnap = await transaction.get(
                db.collection('attendance')
                    .where('memberId', '==', memberId)
                    .orderBy('timestamp', 'desc')
                    .limit(30)
            );

            // [VALIDATION] Check Validity (Expiration & Credits)
            let finalStatus = 'valid';
            let denialReason = null;
            const todayDate = new Date(date); // Use the check-in date for validation

            // 1. Check Expiration
            if (memberData.endDate) {
                const endDate = new Date(memberData.endDate);
                if (todayDate > endDate) {
                    finalStatus = 'denied';
                    denialReason = 'expired';
                }
            }

            // 2. Check Credits
            const safeCredits = Number.isFinite(currentCredits) ? currentCredits : 0;
            if (finalStatus === 'valid' && safeCredits <= 0) {
                finalStatus = 'denied';
                denialReason = 'no_credits';
            }

            const todayRecords = recentSnap.docs.map(d => d.data()).filter(r => r.date === date);
            const sessionCount = todayRecords.length + 1;

            // 3. Create Official Attendance Record
            const attendanceData = {
                memberId,
                memberName: memberData.name,
                branchId,
                date: date,
                className: finalStatus === 'valid' ? (classTitle || '자율수련') : `출석 거부 (${denialReason === 'expired' ? '기간 만료' : '횟수 부족'})`,
                instructor: instructor || '미지정',
                timestamp: timestamp,
                type: 'checkin', // [FIX] Ensure type is present for proper deletion later
                status: finalStatus,
                syncMode: 'offline-restored',
                sessionNumber: sessionCount
            };

            if (finalStatus === 'valid') {
                attendanceData.credits = safeCredits - 1;
                attendanceData.cumulativeCount = currentCount + 1;
            } else {
                attendanceData.denialReason = denialReason;
                attendanceData.credits = safeCredits; // No deduction
                attendanceData.cumulativeCount = currentCount;
            }

            const attRef = db.collection('attendance').doc();
            transaction.set(attRef, attendanceData);

            // 4. Update Member (Only if Valid)
            if (finalStatus === 'valid') {
                const records = recentSnap.docs.map(d => d.data()).filter(r => r.status === 'valid');
                let streak = calculateStreak(records, date);
                if (!Number.isFinite(streak)) streak = 1;

                let startDate = memberData.startDate;
                let endDate = memberData.endDate;

                if (startDate === 'TBD' || !startDate || !memberData.endDate) {
                    startDate = date;
                    const end = new Date(date);
                    end.setDate(end.getDate() + 30);
                    endDate = end.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                }

                transaction.update(memberRef, {
                    credits: admin.firestore.FieldValue.increment(-1),
                    attendanceCount: admin.firestore.FieldValue.increment(1),
                    streak: streak,
                    startDate: startDate,
                    endDate: endDate,
                    lastAttendance: timestamp
                });
                console.log(`[OfflineSync] Sync SUCCESS for ${memberId} (Valid)`);
            } else {
                console.log(`[OfflineSync] Sync DENIED for ${memberId} (${denialReason})`);
            }

            // 5. Mark Pending Record as Processed
            transaction.delete(snapshot.ref);
        });
    } catch (e) {
        console.error(`[OfflineSync] Sync failed for ${memberId}:`, e);
    }
});
