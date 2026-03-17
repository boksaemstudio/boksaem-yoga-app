// Firestore에 가격표 데이터 직접 저장 (functions 폴더의 firebase-admin 사용)
const admin = require('firebase-admin');

// Firebase Admin SDK는 GOOGLE_APPLICATION_CREDENTIALS 또는 default credentials 사용
admin.initializeApp({
    projectId: 'boksaem-yoga'
});

const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';

const pricing = {
    general: {
        label: '일반',
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

async function seedPricing() {
    try {
        const docRef = db.collection('studios').doc(STUDIO_ID).collection('settings').doc('pricing');
        await docRef.set(pricing);
        console.log('✅ 가격표 데이터 Firestore 저장 완료!');
        console.log(`   경로: studios/${STUDIO_ID}/settings/pricing`);
        console.log(`   카테고리: ${Object.keys(pricing).filter(k => k !== '_meta').join(', ')}`);
        console.log('   결제정보: 하나은행 379-910319-22507');
        process.exit(0);
    } catch (e) {
        console.error('❌ 저장 실패:', e.message);
        process.exit(1);
    }
}

seedPricing();
