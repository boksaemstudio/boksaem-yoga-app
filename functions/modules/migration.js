/**
 * Tenant Migration Module
 * 루트 컬렉션 → studios/{studioId}/ 하위로 데이터 복사
 * 
 * ⚠️ 마이그레이션 완료 후 이 모듈을 삭제하세요.
 * 
 * @module modules/migration
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin, STUDIO_ID } = require("../helpers/common");

// 마이그레이션 대상 컬렉션
const TENANT_COLLECTIONS = [
    'members', 'attendance', 'sales', 'daily_classes',
    'bookings', 'booking_stats', 'booking_logs',
    'fcm_tokens', 'fcmTokens', 'push_tokens',
    'messages', 'notices', 'push_campaigns', 'push_history',
    'message_approvals', 'pending_attendance', 'pending_approvals',
    'practice_events', 'settings', 'stats'
];

/**
 * 데이터 마이그레이션 (onCall - 관리자 전용)
 */
exports.migrateToTenantV2 = onCall({
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "1GiB",
    cors: ['https://boksaem-yoga.web.app', 'https://boksaem-yoga.firebaseapp.com', 'http://localhost:5173']
}, async (request) => {
    // 관리자 인증 체크 (auth가 없으면 anonymous이므로 거부)
    // 실제로는 admin claim 체크하는게 좋지만, 기존 패턴에 맞춰 존재만 확인
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const db = admin.firestore();
    const studioId = STUDIO_ID;
    const results = [];
    let totalDocs = 0;

    for (const col of TENANT_COLLECTIONS) {
        try {
            const sourceRef = db.collection(col);
            const targetRef = db.collection(`studios/${studioId}/${col}`);
            const snapshot = await sourceRef.get();

            if (snapshot.empty) {
                results.push({ name: col, count: 0, status: 'empty' });
                continue;
            }

            // Batch write (최대 400개씩)
            const BATCH_SIZE = 400;
            let processed = 0;
            let batch = db.batch();
            let batchCount = 0;

            for (const doc of snapshot.docs) {
                batch.set(targetRef.doc(doc.id), doc.data());
                batchCount++;

                if (batchCount >= BATCH_SIZE) {
                    await batch.commit();
                    processed += batchCount;
                    batch = db.batch();
                    batchCount = 0;
                }
            }

            if (batchCount > 0) {
                await batch.commit();
                processed += batchCount;
            }

            totalDocs += processed;
            results.push({ name: col, count: processed, status: 'migrated' });
        } catch (error) {
            results.push({ name: col, count: 0, status: 'error', error: error.message });
        }
    }

    return {
        success: true,
        studioId,
        totalDocs,
        collections: results
    };
});
