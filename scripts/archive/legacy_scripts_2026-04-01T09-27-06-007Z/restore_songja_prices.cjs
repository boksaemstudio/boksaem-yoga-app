const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function fixPrices() {
    console.log('--- 🩹 박송자 회원 결제 금액 필드 복구 스크립트 ---');
    const songjaId = 'wBGdzNiUifYs80Wzu4Ay';
    const songjaRef = db.collection('studios').doc('boksaem-yoga').collection('members').doc(songjaId);
    
    // 금액(price) 필드가 누락되어 이전 금액이 잘못 뜨는 잔상 해결
    const updatePayload = {
        price: 333000, // 이전 이용권 구매 가격
        upcomingMembership: {
            membershipType: '월 8회 (3개월)',
            credits: 24,
            duration: 90,
            durationMonths: 3,  // RegistrationTab 기준 호환용
            startDate: 'TBD',
            price: 387600 // 선등록 이용권 구매 가격
        }
    };
    
    console.log('업데이트할 금액 필드 정보:');
    console.log(JSON.stringify(updatePayload, null, 2));

    await songjaRef.update(updatePayload);
    
    console.log('\n✅ 박송자 회원의 결제 금액 표기 이슈 완벽 해결!');
    process.exit(0);
}

fixPrices().catch(console.error);
