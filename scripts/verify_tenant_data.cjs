/**
 * 테넌트 데이터 존재 여부 검증 스크립트
 */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function verify() {
    const collections = ['members', 'sales', 'attendance', 'daily_classes', 'monthly_schedules', 'images', 'notices', 'messages', 'weekly_templates', 'push_history'];
    
    console.log('=== 루트 레벨 데이터 ===');
    for (const col of collections) {
        const snap = await db.collection(col).limit(1).get();
        console.log(`  /${col}: ${snap.empty ? '❌ 비어있음' : '✅ 있음 (' + snap.size + '건 샘플)'}`);
    }

    console.log('\n=== 테넌트 경로 데이터 ===');
    for (const col of collections) {
        const snap = await db.collection(`studios/boksaem-yoga/${col}`).limit(1).get();
        console.log(`  /studios/boksaem-yoga/${col}: ${snap.empty ? '❌ 비어있음' : '✅ 있음 (' + snap.size + '건 샘플)'}`);
    }
    
    // daily_classes 상세 확인 — 3월 데이터 있는지
    console.log('\n=== daily_classes 3월 데이터 확인 ===');
    const marchSnap = await db.collection('studios/boksaem-yoga/daily_classes')
        .where('date', '>=', '2026-03-01')
        .where('date', '<=', '2026-03-31')
        .limit(5).get();
    console.log(`  3월 daily_classes: ${marchSnap.size}건`);
    marchSnap.docs.forEach(d => console.log(`    - ${d.id}: ${d.data().date}`));
}

verify().then(() => process.exit(0));
