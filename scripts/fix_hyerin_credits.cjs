const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const acc = require('../functions/service-account-key.json');
try { initializeApp({ credential: cert(acc) }); } catch(e) {}
const db = getFirestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    const mSnap = await tdb.collection('members').where('phone', '==', '010-4633-0826').get();
    const doc = mSnap.docs[0];
    
    // 원장 의도: 기존 잔여 + 신규 = 13회, 오늘 출석 1회 차감 = 12회
    await doc.ref.update({ credits: 12 });
    
    console.log('✅ 박혜린 잔여횟수 수정: 9 → 12회');
    console.log('   (원장 세팅 13회 - 오늘 출석 1회 = 12회)');
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
