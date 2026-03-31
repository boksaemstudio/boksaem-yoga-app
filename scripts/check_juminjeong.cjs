const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    // 주민정 회원 조회
    const membersSnap = await tdb.collection('members').where('name', '==', '주민정').get();
    membersSnap.forEach(doc => {
        const d = doc.data();
        console.log(`👤 ID: ${doc.id} | 이름: ${d.name} | 지점: ${d.branchId} | 크레딧: ${d.credits} | 종료일: ${d.endDate || '없음'}`);
    });

    const memberId = membersSnap.docs[0].id;

    // 3/30 attendance 기록
    console.log('\n--- 3/30 attendance ---');
    const attSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .where('memberId', '==', memberId)
        .get();

    console.log(`총 ${attSnap.size}건`);
    attSnap.forEach(doc => {
        const d = doc.data();
        console.log(`  doc.id: ${doc.id}`);
        console.log(`  className: ${d.className} | status: ${d.status} | method: ${d.method || '일반'} | timestamp: ${d.timestamp}`);
        if (d.createdAt && d.createdAt._seconds) {
            const created = new Date(d.createdAt._seconds * 1000);
            console.log(`  createdAt(KST): ${created.toLocaleString('ko-KR', {timeZone:'Asia/Seoul'})}`);
        }
        console.log('  ---');
    });

    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
