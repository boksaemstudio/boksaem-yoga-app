/**
 * 오늘 출석 데이터 검증 - instructor 필드 확인
 */
const admin = require('firebase-admin');
if (admin.apps.length === 0) {
    const serviceAccount = require('../service-account-key.json');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function verify() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    console.log(`\n📅 날짜: ${today}\n`);

    // 1. 오늘 전체 출석 조회
    const snap = await db.collection('attendance')
        .where('date', '==', today)
        .get();
    
    console.log(`📋 오늘 전체 출석: ${snap.size}건\n`);
    
    snap.docs.forEach(doc => {
        const d = doc.data();
        console.log(`  ${d.memberName || '?'} | className: "${d.className}" | instructor: "${d.instructor}" | branchId: "${d.branchId}" | time: ${d.timestamp?.split('T')[1]?.slice(0,5) || '?'}`);
    });

    // 2. 강사 목록 확인
    console.log('\n--- 등록 강사 목록 ---');
    const instrSnap = await db.collection('instructors').get();
    instrSnap.docs.forEach(doc => {
        const d = doc.data();
        console.log(`  "${d.name}" (id: ${doc.id})`);
    });
}

verify().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
