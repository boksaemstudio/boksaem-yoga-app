/**
 * 오프라인 출석 동기화 트리거
 * 
 * [DRY Refactor] 비즈니스 로직은 coreLogic.js에 위임.
 * 이 파일의 책임: pending 큐 소비, 중복 체크, pending 삭제
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { admin, tenantDb } = require("../../helpers/common");
const { processAttendanceCore } = require('./coreLogic');

exports.onPendingAttendanceCreated = onDocumentCreated({
    document: `studios/{studioId}/pending_attendance/{id}`,
    region: "asia-northeast3"
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const { memberId, branchId, classTitle, instructor, timestamp, date, eventId } = data;
    const tdb = tenantDb(event.params.studioId);

    console.log(`[OfflineSync] Processing pending check-in for member: ${memberId}`);

    try {
        await tdb.raw().runTransaction(async (transaction) => {
            // ━━━━ 1. 중복 체크 (UUID Idempotency) ━━━━
            if (eventId) {
                const duplicateQuery = await transaction.get(
                    tdb.collection('attendance')
                        .where('memberId', '==', memberId)
                        .where('date', '==', date)
                        .where('eventId', '==', eventId)
                        .limit(1)
                );

                if (!duplicateQuery.empty) {
                    console.warn(`[OfflineSync] Duplicate caught for ${memberId}. EventId ${eventId} already processed.`);
                    transaction.delete(tdb.collection('pending_attendance').doc(event.params.id));
                    return;
                }
            }

            // ━━━━ 2. Core Logic 위임 ━━━━
            const result = await processAttendanceCore(transaction, {
                memberId,
                branchId,
                className: classTitle || '자율수련',
                instructor: instructor || '미지정',
                classTime: null,
                dateStr: date,
                timestampISO: timestamp,
                type: 'checkin',
                eventId,
                source: data.source || 'offline',
                studioId: event.params.studioId
            }, {
                skipCreditDeduction: false,
                skipValidation: false,
                preActivatedUpcoming: data.activatedUpcomingMembership || null
            });

            // ━━━━ 3. 출석 기록에 오프라인 마크 추가 ━━━━
            if (result.success) {
                const attRef = tdb.collection('attendance').doc(result.attendanceId);
                transaction.update(attRef, { syncMode: 'offline-restored' });
            }

            // ━━━━ 4. Pending 문서 삭제 ━━━━
            transaction.delete(tdb.collection('pending_attendance').doc(event.params.id));

            if (result.attendanceStatus === 'denied') {
                console.log(`[OfflineSync] Sync DENIED for ${memberId} (${result.denialReason})`);
            }
        });
    } catch (e) {
        console.error(`[OfflineSync] Sync failed for ${memberId}:`, e);
    }
});
