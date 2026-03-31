const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    // 주민정 마이솔 13:30 삭제
    const docId = '7M3MTRtcOWyJ3suGmCG5';
    const doc = await tdb.collection('attendance').doc(docId).get();
    if (doc.exists) {
        const d = doc.data();
        console.log(`❌ 삭제: ${d.memberName} | ${d.className} | ${d.timestamp}`);
        await tdb.collection('attendance').doc(docId).delete();

        // practice_events도 삭제
        const pe = await tdb.collection('practice_events').doc(docId).get();
        if (pe.exists) await tdb.collection('practice_events').doc(docId).delete();

        // 크레딧 복원
        const memberId = d.memberId;
        const mDoc = await tdb.collection('members').doc(memberId).get();
        if (mDoc.exists) {
            const before = mDoc.data().credits;
            await tdb.collection('members').doc(memberId).update({
                credits: admin.firestore.FieldValue.increment(1)
            });
            console.log(`✅ 주민정 크레딧: ${before} → ${before + 1}`);
        }
    }

    // 남은 주민정 기록 확인
    const remaining = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .where('memberName', '==', '주민정')
        .get();
    console.log(`\n주민정 남은 기록: ${remaining.size}건`);
    remaining.forEach(doc => {
        const d = doc.data();
        console.log(`  ✅ ${d.className} | ${d.timestamp} | ${doc.id}`);
    });

    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
