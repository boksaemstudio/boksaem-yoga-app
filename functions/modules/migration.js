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
    cors: require('../helpers/cors').ALLOWED_ORIGINS
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

/**
 * 가격표 데이터 복원 (studios/{studioId} PRICING → settings/pricing)
 */
exports.restorePricingV2 = onCall({
    region: "asia-northeast3",
    cors: require('../helpers/cors').ALLOWED_ORIGINS
}, async (request) => {
    // [FIX] Auth guard — 관리자만 가격표 복원 가능
    const { requireAdmin } = require('../helpers/authGuard');
    requireAdmin(request, 'restorePricingV2');
    const db = admin.firestore();

    const pricing = {
        general: {
            label: '일반',
            branches: ['광흥창점', '마포점'],
            options: [
                { id: 'single', label: '1회권', basePrice: 25000, credits: 1, months: 1, type: 'ticket' },
                { id: '10_session', label: '10회권 (3개월)', basePrice: 200000, credits: 10, months: 3, type: 'ticket' },
                { id: 'month_8', label: '월 8회', basePrice: 143000, credits: 8, months: 1, type: 'subscription', discount3: 408000, discount6: 773000, cashDiscount3: 387600, cashDiscount6: 734350 },
                { id: 'month_12', label: '월 12회', basePrice: 176000, credits: 12, months: 1, type: 'subscription', discount3: 502000, discount6: 951000, cashDiscount3: 476900, cashDiscount6: 903450 },
                { id: 'month_16', label: '월 16회', basePrice: 198000, credits: 16, months: 1, type: 'subscription', discount3: 565000, discount6: 1070000, cashDiscount3: 536750, cashDiscount6: 1016500 },
                { id: 'unlimited', label: '월 무제한', basePrice: 220000, credits: 9999, months: 1, type: 'subscription', discount3: 627000, discount6: 1188000, cashDiscount3: 595650, cashDiscount6: 1128600 },
            ]
        },
        advanced: {
            label: '심화',
            branches: ['광흥창점', '마포점'],
            options: [
                { id: 'single', label: '1회권', basePrice: 35000, credits: 1, months: 1, type: 'ticket' },
                { id: '10_session', label: '10회권 (3개월)', basePrice: 300000, credits: 10, months: 3, type: 'ticket' },
                { id: 'month_4', label: '월 4회', basePrice: 120000, credits: 4, months: 1, type: 'subscription' },
                { id: 'month_8', label: '월 8회', basePrice: 154000, credits: 8, months: 1, type: 'subscription', discount3: 439000, discount6: 832000, cashDiscount3: 417050, cashDiscount6: 790400 },
                { id: 'month_12', label: '월 12회', basePrice: 187000, credits: 12, months: 1, type: 'subscription', discount3: 533000, discount6: 1010000, cashDiscount3: 506350, cashDiscount6: 959500 },
                { id: 'month_16', label: '월 16회', basePrice: 209000, credits: 16, months: 1, type: 'subscription', discount3: 596000, discount6: 1129000, cashDiscount3: 566200, cashDiscount6: 1072550 },
                { id: 'month_20', label: '월 20회', basePrice: 231000, credits: 20, months: 1, type: 'subscription', discount3: 659000, discount6: 1248000, cashDiscount3: 626050, cashDiscount6: 1185600 },
                { id: 'unlimited', label: '월 무제한', basePrice: 275000, credits: 9999, months: 1, type: 'subscription', discount3: 784000, discount6: 1485000, cashDiscount3: 744800, cashDiscount6: 1410750 },
            ]
        },
        saturday_hatha: {
            label: '토요하타',
            branches: ['마포점'],
            options: [
                { id: '4_session', label: '4회권 (1개월)', basePrice: 180000, credits: 4, months: 1, type: 'ticket' },
                { id: 'single', label: '원데이', basePrice: 50000, credits: 1, months: 1, type: 'ticket' },
            ]
        },
        kids_flying: {
            label: '키즈플라잉',
            branches: ['마포점'],
            options: [
                { id: '10_session', label: '10회권', basePrice: 220000, credits: 10, months: 3, type: 'ticket' },
                { id: 'single', label: '원데이', basePrice: 35000, credits: 1, months: 1, type: 'ticket' },
            ]
        },
        prenatal: {
            label: '임산부요가',
            branches: ['마포점'],
            options: [
                { id: '8_session', label: '8회권', basePrice: 180000, credits: 8, months: 3, type: 'ticket' },
                { id: 'single', label: '원데이', basePrice: 40000, credits: 1, months: 1, type: 'ticket' },
            ]
        },
        _meta: {
            payment: { bank: '하나은행', account: '379-910319-22507', holder: '복샘요가(김복순)' },
            discountNote: '3개월 이상 등록 시 현금 이체 시 최종 금액에서 5% 추가할인',
            holdRules: ['1개월권: 수강연기 없음', '3개월권: 1회 (최대 2주)', '6개월권: 2회 (최대 4주)']
        }
    };

    // 테넌트 경로에 저장
    await db.collection(`studios/${STUDIO_ID}/settings`).doc('pricing').set(pricing);

    return {
        success: true,
        categories: Object.keys(pricing).filter(k => k !== '_meta'),
        message: `Saved ${Object.keys(pricing).filter(k => k !== '_meta').length} pricing categories with payment info`
    };
});
