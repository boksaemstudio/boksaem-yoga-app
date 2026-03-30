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

async function investigate() {
    console.log('--- 🔍 박송자 회원 상세 이력 추적 로직 ---');
    const memberId = 'wBGdzNiUifYs80Wzu4Ay';
    const tdb = db.collection('tenants').doc('boksaem-yoga');
    
    const memberSnap = await tdb.collection('members').doc(memberId).get();
    console.log('[회원 현재 상태]');
    console.log(JSON.stringify(memberSnap.data(), null, 2));

    const attSnap = await tdb.collection('attendance')
        .where('memberId', '==', memberId)
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
        
    console.log('\n[최근 출석 기록 (10건)]');
    attSnap.forEach(doc => {
        const d = doc.data();
        console.log(`- [${d.date} / ${d.timestamp}] ${d.className} | 상태:${d.status} | credits:${d.credits} | deletedAt:${d.deletedAt || 'N/A'}`);
    });

    const salesSnap = await tdb.collection('sales').where('memberId', '==', memberId).get();
        
    console.log('\n[결제 상세 내역]');
    salesSnap.forEach(doc => {
        const d = doc.data();
        console.log(`- [${d.date || d.timestamp}] ${d.itemName} | 시작일:${d.startDate} ~ 종료일:${d.endDate} | ${d.totalAmount}원 | deletedAt:${d.deletedAt || 'N/A'}`);
    });
}

investigate().catch(console.error);
