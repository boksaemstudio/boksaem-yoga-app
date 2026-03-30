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

async function restoreParkSongJa() {
    console.log('--- 🩹 박송자 회원(wBGdzNiUifYs80Wzu4Ay) 진실 데이터 복구 스크립트 ---');
    const songjaId = 'wBGdzNiUifYs80Wzu4Ay';
    const songjaRef = db.collection('studios').doc('boksaem-yoga').collection('members').doc(songjaId);
    
    // 이전에 관리자가 수동으로 잘못 입력한 26-02-23 데이터 덮어쓰기
    // 오늘 아침 출석으로 기존 회원권은 끝난 상태 (잔여 0)
    // 그리고 결제한 월 8회권은 선등록 상태 (upcomingMembership)
    
    const updatePayload = {
        credits: 0, // 오늘 아침 마지막 출석으로 기존 결제권 완전 소진
        membershipType: '알 수 없음', // 이전 회원권 (2025.12.29 구매본)
        startDate: '2025-12-29', // 과거 회원권 시작일 (추정)
        endDate: '2026-03-29', // 3개월 만료됨
        upcomingMembership: {
            membershipType: '월 8회 (3개월)',
            credits: 24, // 8회 * 3개월
            duration: 90, // 3개월
            startDate: 'TBD' // 첫 출석 시 시작 대기중
        }
    };
    
    console.log('해당 회원 정보 덮어씌움 (복구 전 데이터는 폐기):');
    console.log(JSON.stringify(updatePayload, null, 2));

    await songjaRef.update(updatePayload);
    
    console.log('\n✅ 박송자 회원의 선등록 상태 뱃지 및 기존 데이터 복구 완료!');
    process.exit(0);
}

restoreParkSongJa().catch(console.error);
