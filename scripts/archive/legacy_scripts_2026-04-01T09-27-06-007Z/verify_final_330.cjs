const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    // 김상아ttc9기 현재 출석 기록 확인
    const snap = await tdb.collection('members').where('name', '==', '김상아ttc9기').get();
    const memberId = snap.docs[0].id;
    const mData = snap.docs[0].data();
    console.log(`👤 김상아ttc9기 | ID: ${memberId} | 크레딧: ${mData.credits}`);

    const attSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .where('memberId', '==', memberId)
        .get();

    console.log(`\n3/30 출석 기록: ${attSnap.size}건`);
    attSnap.forEach(doc => {
        const d = doc.data();
        console.log(`  ✅ ${d.className} | ${d.status} | docId: ${doc.id}`);
    });

    // 전체 3/30 요약
    const allAtt = await tdb.collection('attendance').where('date', '==', '2026-03-30').get();
    let gw = 0, mp = 0;
    allAtt.forEach(doc => {
        const d = doc.data();
        if (d.deletedAt) return;
        if (d.branchId === 'gwangheungchang') gw++;
        else if (d.branchId === 'mapo') mp++;
    });
    console.log(`\n📊 3/30 전체: 광흥창 ${gw}명 / 마포 ${mp}명 / 총 ${gw + mp}명`);
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
