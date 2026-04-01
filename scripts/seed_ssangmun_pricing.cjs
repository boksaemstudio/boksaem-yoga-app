const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: 'boksaem-yoga'
    });
}
const db = admin.firestore();

const pricingData = {
    general: {
        label: "일반 (주 2~3회)",
        options: [
            { id: "month_1", label: "1개월 (8회)", basePrice: 150000, credits: 8, months: 1, type: "subscription" },
            { id: "month_3", label: "3개월 (24회)", basePrice: 400000, credits: 24, months: 3, type: "subscription", discountPrice: 380000, cashPrice: 350000 },
            { id: "month_6", label: "6개월 (48회)", basePrice: 750000, credits: 48, months: 6, type: "subscription", discountPrice: 700000, cashPrice: 650000 }
        ]
    },
    intensive: {
        label: "심화 (무제한)",
        options: [
            { id: "unlimited_1", label: "1개월 무제한", basePrice: 200000, credits: 9999, months: 1, type: "subscription" },
            { id: "unlimited_3", label: "3개월 무제한", basePrice: 550000, credits: 9999, months: 3, type: "subscription", discountPrice: 520000, cashPrice: 480000 },
            { id: "unlimited_6", label: "6개월 무제한", basePrice: 1000000, credits: 9999, months: 6, type: "subscription", discountPrice: 950000, cashPrice: 850000 }
        ]
    },
    ticket: {
        label: "쿠폰제",
        options: [
            { id: "ticket_10", label: "10회권 (3개월)", basePrice: 200000, credits: 10, months: 3, type: "ticket" },
            { id: "ticket_20", label: "20회권 (6개월)", basePrice: 350000, credits: 20, months: 6, type: "ticket" },
            { id: "ticket_1", label: "1회 체험권", basePrice: 30000, credits: 1, months: 1, type: "ticket" }
        ]
    }
};

async function seedPricing() {
    const tenantId = 'ssangmun-yoga';
    try {
        await db.collection('studios').doc(tenantId).collection('settings').doc('pricing').set(pricingData);
        console.log('✅ Successfully seeded pricing data for Ssangmun Yoga!');
        process.exit(0);
    } catch (e) {
        console.error('Failed to seed pricing:', e);
        process.exit(1);
    }
}

seedPricing();
