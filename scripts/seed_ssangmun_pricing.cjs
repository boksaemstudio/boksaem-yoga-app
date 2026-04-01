const admin = require('firebase-admin');
const acc = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(acc) });

async function seedSsangmunPricing() {
    console.log("=== SEEDING SSANGMUN PRICING ===");
    const db = admin.firestore();

    const pricingData = {
        "cat_tickets": {
            "label": "1회권 및 10회권",
            "branches": ["ssangmun-yoga"],
            "options": [
                { "id": "opt_t1", "label": "1회권", "basePrice": 35000, "credits": 1, "months": 1, "type": "ticket" },
                { "id": "opt_t10", "label": "10회권(유효 3개월)", "basePrice": 300000, "credits": 10, "months": 3, "type": "ticket" }
            ]
        },
        "cat_m8": {
            "label": "월 8회 (주2회)",
            "branches": ["ssangmun-yoga"],
            "options": [
                { "id": "opt_m8_1", "label": "1개월 정상가", "basePrice": 140000, "credits": 8, "months": 1, "type": "subscription" },
                { "id": "opt_m8_3", "label": "3개월 등록 (10%할인, 현금 34만2천)", "basePrice": 360000, "credits": 24, "months": 3, "type": "subscription" },
                { "id": "opt_m8_6", "label": "6개월 등록 (15%할인, 현금 63만7920)", "basePrice": 671500, "credits": 48, "months": 6, "type": "subscription" }
            ]
        },
        "cat_m12": {
            "label": "월 12회 (주3회)",
            "branches": ["ssangmun-yoga"],
            "options": [
                { "id": "opt_m12_1", "label": "1개월 정상가", "basePrice": 170000, "credits": 12, "months": 1, "type": "subscription" },
                { "id": "opt_m12_3", "label": "3개월 등록 (10%할인, 현금 41만8950)", "basePrice": 441000, "credits": 36, "months": 3, "type": "subscription" },
                { "id": "opt_m12_6", "label": "6개월 등록 (15%할인, 현금 78만3270)", "basePrice": 824500, "credits": 72, "months": 6, "type": "subscription" }
            ]
        },
        "cat_m16": {
            "label": "월 16회 (주4회)",
            "branches": ["ssangmun-yoga"],
            "options": [
                { "id": "opt_m16_1", "label": "1개월 정상가", "basePrice": 190000, "credits": 16, "months": 1, "type": "subscription" },
                { "id": "opt_m16_3", "label": "3개월 등록 (10%할인, 현금 47만250)", "basePrice": 495000, "credits": 48, "months": 3, "type": "subscription" },
                { "id": "opt_m16_6", "label": "6개월 등록 (15%할인, 현금 88만170)", "basePrice": 926500, "credits": 96, "months": 6, "type": "subscription" }
            ]
        },
        "cat_m20": {
            "label": "월 20회 (주5회)",
            "branches": ["ssangmun-yoga"],
            "options": [
                { "id": "opt_m20_1", "label": "1개월 정상가", "basePrice": 210000, "credits": 20, "months": 1, "type": "subscription" },
                { "id": "opt_m20_3", "label": "3개월 등록 (10%할인, 현금 52만1550)", "basePrice": 549000, "credits": 60, "months": 3, "type": "subscription" },
                { "id": "opt_m20_6", "label": "6개월 등록 (15%할인, 현금 97만7075)", "basePrice": 1028500, "credits": 120, "months": 6, "type": "subscription" }
            ]
        },
        "cat_m99": {
            "label": "월 무제한",
            "branches": ["ssangmun-yoga"],
            "options": [
                { "id": "opt_m99_1", "label": "1개월 정상가", "basePrice": 250000, "credits": 9999, "months": 1, "type": "subscription" },
                { "id": "opt_m99_3", "label": "3개월 등록 (10%할인, 현금 62만4150)", "basePrice": 657000, "credits": 9999, "months": 3, "type": "subscription" },
                { "id": "opt_m99_6", "label": "6개월 등록 (15%할인, 현금 117만870)", "basePrice": 1232500, "credits": 9999, "months": 6, "type": "subscription" }
            ]
        }
    };

    await db.doc('studios/ssangmun-yoga/settings/pricing').set(pricingData);
    console.log("✅ SSANGMUN PRICING INJECTED SUCCESSFULLY.");
}

seedSsangmunPricing().then(() => process.exit(0)).catch(console.error);
