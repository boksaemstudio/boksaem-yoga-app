/**
 * Attendance Module
 * 출석 관련 Cloud Functions
 * 
 * @module modules/attendance
 * [Refactor] Extracted from index.js
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { admin, logAIError, getKSTDateString } = require("../helpers/common");

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
    // [FIX] Use KST (UTC+9) instead of server UTC time for accurate time band classification
    const kstHour = new Date(new Date(timestamp).getTime() + 9 * 60 * 60 * 1000).getUTCHours();
    if (kstHour < 9) return 'early';
    if (kstHour < 12) return 'morning';
    if (kstHour < 15) return 'afternoon';
    if (kstHour < 18) return 'evening';
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

    const { memberId, branchId, classTitle, instructor, classTime, force, eventId } = request.data;
    const db = admin.firestore();

    // [DEBUG] Check force flag and eventId
    console.log(`[Attendance] Check-in request for ${memberId} in ${branchId}. Force: ${force}, EventId: ${eventId}`);

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
            
            // [FIX] Move 'today' and 'now' outside of the if block to fix ReferenceError
            const today = getKSTDateString(new Date());
            const now = new Date();
            
            // [CRITICAL] Check for Duplicates (UUID Idempotency) inside Transaction
            // If the client provided an eventId, we ensure it hasn't been processed yet.
            // [UX] If 'force' is provided (Member Confirmed Dual Check-in after 25s), SKIP this check.
            if (!force && eventId) {
                const duplicateQuery = db.collection('attendance')
                    .where('memberId', '==', memberId)
                    .where('date', '==', today)
                    .where('eventId', '==', eventId)
                    .limit(1);
                
                const duplicateSnap = await transaction.get(duplicateQuery);
                
                if (!duplicateSnap.empty) {
                    // If duplicate found, return the EXISTING success response (Idempotent)
                    const existing = duplicateSnap.docs[0].data();
                    console.log(`[Attendance] Duplicate check-in blocked for ${memberId} (EventId: ${eventId})`);
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
            } else {
                console.log(`[Attendance] Force Check-in or No EventId for ${memberId}. Skipping deduplication.`);
            }


            // --- Normal Logic starts here ---
            
            // [FIX] Validating '자율수련': Server-side fallback matching
            let finalClassTitle = classTitle;
            let finalInstructor = instructor;
            let matched = null;
            
            const nowTime = new Date();
            const kstString = nowTime.toLocaleString('en-US', { timeZone: 'Asia/Seoul', hour12: false, hour: '2-digit', minute: '2-digit' });
            const [kstH, kstM] = kstString.split(':').map(Number);
            const currentMin = kstH * 60 + kstM;

            if (!classTitle || classTitle === '자율수련') {
                try {
                    const schedDocRef = db.collection('daily_classes').doc(`${branchId}_${today}`);
                    const schedSnap = await transaction.get(schedDocRef);
                    
                    if (schedSnap.exists) {
                        const classes = (schedSnap.data().classes || []).filter(c => c.status !== 'cancelled');

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
                        } else {
                             // [FIX] No daily class matched. It's truly a self-practice.
                             finalClassTitle = '자율수련';
                             finalInstructor = '회원';
                             matched = { time: kstString }; // Use actual check-in time
                             console.log(`[Attendance] Server-side matched: ${finalClassTitle} (${finalInstructor}) at ${kstString} for ${memberId}`);
                        }
                    } else {
                         // [FIX] No daily_classes doc exists. It's truly a self-practice.
                         finalClassTitle = '자율수련';
                         finalInstructor = '회원';
                         matched = { time: kstString }; // Use actual check-in time
                         console.log(`[Attendance] No schedule found. Server-side matched: ${finalClassTitle} (${finalInstructor}) at ${kstString} for ${memberId}`);
                    }
                } catch (schedErr) {
                    console.warn("[Attendance] Server-side schedule match failed:", schedErr);
                    // [FIX] Fallback to check-in time on error
                    finalClassTitle = '자율수련';
                    finalInstructor = '회원';
                    matched = { time: kstString };
                }
            }
            
            let attendanceStatus = 'valid';
            let denialReason = null;

            // [NEW] Check and activate upcomingMembership if it exists and is due
            let appliedUpcoming = false;
            let swappedData = null;
            if (memberData.upcomingMembership && memberData.upcomingMembership.startDate) {
                const isTBD = memberData.upcomingMembership.startDate === 'TBD';
                
                let shouldActivate = false;
                let newStartDate = memberData.upcomingMembership.startDate;
                let newEndDate = memberData.upcomingMembership.endDate;

                if (isTBD) {
                    // TBD인 경우 현재 회원권이 소진/만료되었을 때만 첫 출석으로 간주해 활성화
                    const currentCredits = memberData.credits || 0;
                    const isCurrentExpired = memberData.endDate ? (new Date(today) > new Date(memberData.endDate)) : false;
                    const isCurrentExhausted = currentCredits <= 0 || isCurrentExpired;

                    if (isCurrentExhausted) {
                        shouldActivate = true;
                        newStartDate = today;
                        const durationMonths = memberData.upcomingMembership.durationMonths || 1;
                        if (durationMonths === 9999) { // 무제한 같은 특수 케이스 처리 (fallback)
                            const end = new Date(today);
                            end.setMonth(end.getMonth() + 1);
                            end.setDate(end.getDate() - 1);
                            newEndDate = getKSTDateString(end);
                        } else {
                            const end = new Date(today);
                            end.setMonth(end.getMonth() + durationMonths);
                            end.setDate(end.getDate() - 1);
                            newEndDate = getKSTDateString(end);
                        }
                    }
                } else {
                    const upcomingStart = new Date(memberData.upcomingMembership.startDate);
                    const todayDate = new Date(today);
                    if (todayDate >= upcomingStart) {
                        shouldActivate = true;
                    }
                }
                
                if (shouldActivate) {
                    console.log(`[Attendance] Activating upcoming membership for ${memberId}`);
                    // Override memberData fields in memory for current check-in logic
                    memberData.membershipType = memberData.upcomingMembership.membershipType;
                    memberData.credits = memberData.upcomingMembership.credits;
                    memberData.startDate = newStartDate;
                    memberData.endDate = newEndDate;
                    
                    swappedData = {
                        membershipType: memberData.membershipType,
                        credits: memberData.credits,
                        startDate: memberData.startDate,
                        endDate: memberData.endDate,
                        upcomingMembership: admin.firestore.FieldValue.delete()
                    };
                    appliedUpcoming = true;
                }
            }

            const currentCredits = memberData.credits || 0;
            const currentCount = memberData.attendanceCount || 0;
            
            // 1. Check Expiration
            if (memberData.endDate) {
                const todayDate = new Date(today);
                const endDate = new Date(memberData.endDate);
                
                // [DEBUG] Diagnosing unexpected 'expired' status
                console.log(`[Attendance] Expiry Check - Member: ${memberData.name} (${memberId}) | Today: ${today} | EndDate: ${memberData.endDate} | IsExpired: ${todayDate > endDate}`);
                
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
                eventId: eventId || null,
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
                    endDate = getKSTDateString(end);
                }

                const updates = {
                    credits: newCredits,
                    attendanceCount: newCount,
                    streak: streak,
                    startDate: startDate,
                    endDate: endDate,
                    lastAttendance: now.toISOString()
                };
                
                if (appliedUpcoming && swappedData) {
                    // Include membership swap if applied
                    Object.assign(updates, swappedData);
                }

                transaction.update(memberRef, updates);
            } else {
                 console.log(`[Attendance] Denied check-in for ${memberId}: ${denialReason}`);
                 
                 // Even if denied, if we applied an upcoming membership (e.g., started but 0 credits or something weird),
                 // we should still save the swap.
                 if (appliedUpcoming && swappedData) {
                     transaction.update(memberRef, swappedData);
                 }
            }

            return {
                success: true,
                attendanceId: newAttRef.id,
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
        const cutoffDate = getKSTDateString(thirtyDaysAgo);

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

                    const attendanceId = event.params.attendanceId;
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
                                        badge: 'https://boksaem-yoga.web.app/logo_circle.png',
                                        tag: `att-${attendanceId}`
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
    const { memberId, branchId, classTitle, instructor, timestamp, date, eventId } = data;
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

            // [CRITICAL] Check for UUID Idempotency to prevent Double-Charging on Offline Sync
            if (eventId) {
                const duplicateQuery = await transaction.get(
                    db.collection('attendance')
                        .where('memberId', '==', memberId)
                        .where('date', '==', date)
                        .where('eventId', '==', eventId)
                        .limit(1)
                );

                if (!duplicateQuery.empty) {
                    console.warn(`[OfflineSync] Duplicate caught for ${memberId}. EventId ${eventId} was already processed safely. Deleting pending document.`);
                    // Delete the pending document without producing an attendance record to prevent loops
                    transaction.delete(db.collection('pending_attendance').doc(event.params.id));
                    return;
                }
            }

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
                eventId: eventId || null, // [NEW] Track eventId for safety
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

            // [NEW] Delete the pending record since it was successfully migrated to official attendance
            transaction.delete(db.collection('pending_attendance').doc(event.params.id));

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
                    endDate = getKSTDateString(end);
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

/**
 * 출석 사진 업로드 감지 → 강사 푸시 알림에 사진 추가
 * photoUrl이 추가되면 기존 알림을 사진 포함 버전으로 교체 (같은 tag 사용)
 */
exports.onAttendancePhotoAdded = onDocumentUpdated({
    document: "attendance/{attendanceId}",
    region: "asia-northeast3"
}, async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // photoUrl이 새로 추가된 경우에만 실행
    if (before.photoUrl || !after.photoUrl) return;

    const db = admin.firestore();
    const attendanceId = event.params.attendanceId;
    const instructorName = after.instructor;

    if (!instructorName || instructorName === '미지정' || instructorName === '회원') return;

    try {
        const tokensSnap = await db.collection('fcm_tokens')
            .where('role', '==', 'instructor')
            .where('instructorName', '==', instructorName)
            .get();

        if (tokensSnap.empty) return;

        const memberName = after.memberName || '회원';
        const className = after.className || '수업';

        let rankLabel = '';
        const totalCount = after.cumulativeCount || 0;
        if (totalCount === 1) rankLabel = ' [신규]';
        else if (totalCount >= 2 && totalCount <= 3) rankLabel = ` [${totalCount}회차]`;

        let body = `${memberName}님이 출석하셨습니다.`;
        if (after.credits !== undefined || after.endDate) {
            const credits = after.credits !== undefined ? `${after.credits}회 남음` : '';
            const expiry = after.endDate ? `(~${after.endDate.slice(2)})` : '';
            body = `${className} | ${credits} ${expiry}`;
        }

        const tokens = tokensSnap.docs.map(doc => doc.data().token).filter(Boolean);

        for (const token of tokens) {
            try {
                await admin.messaging().send({
                    token,
                    notification: {
                        title: `🧘‍♀️ ${memberName}${rankLabel}님 출석`,
                        body: body,
                        imageUrl: after.photoUrl
                    },
                    webpush: {
                        notification: {
                            icon: 'https://boksaem-yoga.web.app/logo_circle.png',
                            badge: 'https://boksaem-yoga.web.app/logo_circle.png',
                            image: after.photoUrl,
                            tag: `att-${attendanceId}`,
                            renotify: false
                        },
                        fcm_options: { link: 'https://boksaem-yoga.web.app/instructor' }
                    }
                });
            } catch (sendErr) {
                if (sendErr.code === 'messaging/invalid-registration-token' ||
                    sendErr.code === 'messaging/registration-token-not-registered') {
                    await db.collection('fcm_tokens').doc(token).delete().catch(() => {});
                }
            }
        }
        console.log(`[Photo Push] Sent photo notification for ${attendanceId}`);
    } catch (err) {
        console.warn('[Photo Push] Error:', err.message);
    }
});
