/**
 * 예약 관리 Cloud Functions
 * - 노쇼 자동 처리 (매일 22:00 KST)
 * - 예약 취소 시 대기열 자동 승격 + 푸시 알림
 * - 예약/취소 시 강사/관리자 알림
 * 
 * @module modules/booking
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { admin, tenantDb, STUDIO_ID, getKSTDateString, getAllFCMTokens, getStudioName } = require("../helpers/common");

/**
 * 🔴 노쇼 자동 처리 (매시간 실행 — 끝난 수업만 즉시 처리)
 * 
 * 오늘 예약 중 classTime이 현재 시간보다 이전인 수업 → 'noshow' 변경 + 크레딧 차감
 * 예: 10:00 수업 예약 → 11:00에 실행 시 미출석이면 즉시 노쇼 처리
 */
exports.processNoshowsV2 = onSchedule({
    schedule: "0 * * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3"
}, async (event) => {
    const tdb = tenantDb(STUDIO_ID);
    const todayStr = getKSTDateString(new Date());
    
    // 현재 KST 시간 (HH:MM)
    const nowKST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const currentHour = nowKST.getHours();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(nowKST.getMinutes()).padStart(2, '0')}`;
    
    console.log(`[Booking] Checking no-shows for ${todayStr}, current KST: ${currentTimeStr}`);
    
    try {
        // 오늘 예약 중 아직 booked 상태인 것들
        const snapshot = await tdb.collection('bookings')
            .where('date', '==', todayStr)
            .where('status', '==', 'booked')
            .get();
        
        if (snapshot.empty) {
            console.log('[Booking] No pending bookings.');
            return;
        }
        
        // classTime이 현재 시간보다 이전인 것만 필터 (수업이 끝난 것만)
        const overdueBookings = snapshot.docs.filter(doc => {
            const classTime = doc.data().classTime; // "10:00", "14:30" 등
            if (!classTime) return currentHour >= 22; // 시간 없으면 밤 10시 이후 처리
            return classTime < currentTimeStr; // 이미 지난 수업
        });
        
        if (overdueBookings.length === 0) {
            console.log('[Booking] No overdue bookings to process.');
            return;
        }
        
        console.log(`[Booking] Found ${overdueBookings.length} overdue bookings (of ${snapshot.size} total).`);
        
        // 2. 설정에서 노쇼 차감값 가져오기
        let noshowDeduct = 1;
        try {
            const studioSnap = await tdb.raw().collection('studios').doc('default').get();
            if (studioSnap.exists) {
                noshowDeduct = studioSnap.data().POLICIES?.BOOKING_RULES?.noshowCreditDeduct || 1;
            }
        } catch (e) {
            console.warn('[Booking] Failed to fetch studio config, using default.');
        }
        
        // 3. 배치 처리
        const batch = tdb.raw().batch();
        const noshowMembers = [];
        
        for (const doc of overdueBookings) {
            const booking = doc.data();
            
            // 예약 문서 → noshow로 변경
            batch.update(doc.ref, {
                status: 'noshow',
                noshowAt: admin.firestore.FieldValue.serverTimestamp(),
                creditDeducted: noshowDeduct,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // 회원 크레딧 차감
            if (noshowDeduct > 0 && booking.memberId) {
                const memberRef = tdb.collection('members').doc(booking.memberId);
                batch.update(memberRef, {
                    credits: admin.firestore.FieldValue.increment(-noshowDeduct)
                });
                
                noshowMembers.push({
                    memberId: booking.memberId,
                    memberName: booking.memberName,
                    className: booking.className,
                    classTime: booking.classTime,
                    deducted: noshowDeduct
                });
            }
        }
        
        await batch.commit();
        console.log(`[Booking] Processed ${noshowMembers.length} no-shows. Credit deducted: ${noshowDeduct} each.`);
        
        // 4. 관리자에게 노쇼 요약 알림
        if (noshowMembers.length > 0) {
            const studioName = await getStudioName(STUDIO_ID);
            const { tokens } = await getAllFCMTokens(null, { role: 'admin', studioId: STUDIO_ID });
            
            // [ROOT FIX] 'type' → 'role' (실제 저장 필드명). 레거시 'type' 필드도 보험 조회
            let adminTokenSnap = await tdb.collection('fcm_tokens').where('role', '==', 'admin').get();
            // 혹시 'type' 필드로 저장된 레거시 토큰도 잡기
            const legacySnap = await tdb.collection('fcm_tokens').where('type', '==', 'admin').get().catch(() => ({ docs: [] }));
            const adminTokens = [...new Set([...tokens, ...adminTokenSnap.docs.map(d => d.id), ...legacySnap.docs.map(d => d.id)])];
            
            if (adminTokens.length > 0) {
                const summary = noshowMembers.slice(0, 5).map(m => 
                    `${m.memberName} (${m.classTime} ${m.className})`
                ).join(', ');
                
                const body = `오늘 ${noshowMembers.length}건의 노쇼가 처리되었습니다.\n${summary}${noshowMembers.length > 5 ? ` 외 ${noshowMembers.length - 5}건` : ''}`;
                
                await admin.messaging().sendEachForMulticast({
                    tokens: adminTokens,
                    notification: {
                        title: `${studioName} 노쇼 처리`,
                        body: body.substring(0, 100)
                    },
                    data: { 
                        type: 'noshow_summary',
                        count: String(noshowMembers.length)
                    }
                });
            }
        }
        
        // 5. 노쇼 처리 로그 저장
        await tdb.collection('booking_logs').add({
            type: 'noshow_batch',
            date: todayStr,
            count: noshowMembers.length,
            creditDeducted: noshowDeduct,
            members: noshowMembers.slice(0, 20), // 최대 20명만 로그
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        console.error("[Booking] No-show processing failed:", error);
    }
});

/**
 * 📋 예약 상태 변경 트리거
 * 
 * 예약이 cancelled로 변경되면:
 * 1. 대기열에서 다음 순번 자동 승격 (booked로 변경)
 * 2. 승격된 회원에게 푸시 알림 발송
 * 
 * 예약이 booked → attended로 변경되면:
 * 3. 출석 확인 로그 (선택)
 */
exports.onBookingStatusChanged = onDocumentUpdated({
    document: `studios/{studioId}/bookings/{bookingId}`,
    region: "asia-northeast3"
}, async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const tdb = tenantDb(event.params.studioId);
    
    // 상태가 변하지 않았으면 무시
    if (before.status === after.status) return null;
    
    console.log(`[Booking] Status changed: ${before.status} → ${after.status} (${event.params.bookingId})`);
    
    // ─── 케이스 1: 예약 취소 → 대기열 승격 ───
    if (after.status === 'cancelled' && before.status === 'booked') {
        try {
            // 같은 수업의 대기자 조회
            const waitlistSnap = await tdb.collection('bookings')
                .where('date', '==', after.date)
                .where('classIndex', '==', after.classIndex)
                .where('branchId', '==', after.branchId || '')
                .where('status', '==', 'waitlisted')
                .get();
            
            if (waitlistSnap.empty) {
                console.log('[Booking] No waitlisted members to promote.');
                return null;
            }
            
            // 대기 순번 정렬
            const waitlisted = waitlistSnap.docs
                .map(d => ({ ref: d.ref, ...d.data() }))
                .sort((a, b) => (a.waitlistPosition || 0) - (b.waitlistPosition || 0));
            
            // 첫 번째 대기자 승격
            const promoted = waitlisted[0];
            const batch = tdb.raw().batch();
            
            batch.update(promoted.ref, {
                status: 'booked',
                waitlistPosition: null,
                promotedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // 나머지 대기자 순서 재조정
            for (let i = 1; i < waitlisted.length; i++) {
                batch.update(waitlisted[i].ref, {
                    waitlistPosition: i,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            
            await batch.commit();
            console.log(`[Booking] Promoted ${promoted.memberName} from waitlist.`);
            
            // 승격된 회원에게 푸시 알림
            if (promoted.memberId) {
                const { tokens } = await getAllFCMTokens(null, { memberId: promoted.memberId, studioId: event.params.studioId });
                
                if (tokens.length > 0) {
                    const studioName = await getStudioName(event.params.studioId);
                    await admin.messaging().sendEachForMulticast({
                        tokens,
                        notification: {
                            title: `${studioName} 예약 확정`,
                            body: `대기 중이던 ${after.classTime || ''} ${after.className || '수업'} 예약이 확정되었습니다! 🎉`
                        },
                        data: {
                            type: 'booking_promoted',
                            date: after.date,
                            className: after.className || ''
                        }
                    });
                    console.log(`[Booking] Push sent to ${promoted.memberName}.`);
                }
            }
            
        } catch (error) {
            console.error("[Booking] Waitlist promotion failed:", error);
        }
    }
    
    // ─── 케이스 2: 새로 예약됨 → 강사에게 알림 (선택적) ───
    // 향후 강사 알림 기능 추가 가능
    
    return null;
});

/**
 * 📊 예약 일일 통계 (매일 23:30 KST)
 * 
 * 오늘의 예약 통계를 booking_stats 컬렉션에 저장
 */
exports.generateBookingStatsV2 = onSchedule({
    schedule: "30 23 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3"
}, async (event) => {
    const tdb = tenantDb(STUDIO_ID);
    const todayStr = getKSTDateString(new Date());
    
    console.log(`[Booking] Generating daily stats for ${todayStr}`);
    
    try {
        const snapshot = await tdb.collection('bookings')
            .where('date', '==', todayStr)
            .get();
        
        const bookings = snapshot.docs.map(d => d.data());
        
        const stats = {
            date: todayStr,
            total: bookings.length,
            booked: bookings.filter(b => b.status === 'booked').length,
            attended: bookings.filter(b => b.status === 'attended').length,
            noshow: bookings.filter(b => b.status === 'noshow').length,
            cancelled: bookings.filter(b => b.status === 'cancelled').length,
            waitlisted: bookings.filter(b => b.status === 'waitlisted').length,
            attendanceRate: 0,
            generatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const resolved = stats.attended + stats.noshow;
        if (resolved > 0) {
            stats.attendanceRate = Math.round((stats.attended / resolved) * 100);
        }
        
        await tdb.collection('booking_stats').doc(todayStr).set(stats);
        console.log(`[Booking] Stats saved: ${JSON.stringify(stats)}`);
        
    } catch (error) {
        console.error("[Booking] Stats generation failed:", error);
    }
});
