const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    console.log('='.repeat(60));
    console.log('  김상아ttc9기 중복 출석 정리');
    console.log('='.repeat(60));

    // 김상아 수동출석이 이미 있으므로, 광흥창 복구 스크립트가 만든 중복 2건 삭제
    const dupes = [
        'gwang_restored_R6zv2B8gc1aFRoDXDKIM',  // 하타 중복
        'gwang_restored_9DybR7lKR2YMEyuIud1A',  // 아쉬탕가 중복
    ];

    for (const docId of dupes) {
        const doc = await tdb.collection('attendance').doc(docId).get();
        if (doc.exists) {
            const d = doc.data();
            console.log(`❌ 삭제: ${d.memberName} | ${d.className} | ${docId}`);
            await tdb.collection('attendance').doc(docId).delete();
            
            // practice_events에서도 삭제
            const pe = await tdb.collection('practice_events').doc(docId).get();
            if (pe.exists) await tdb.collection('practice_events').doc(docId).delete();
        }
    }

    // 크레딧 복원 (+2)
    const memberId = '8n91ZxUvhNdniAbqGwAd'; // 김상아ttc9기
    // 먼저 ID 찾기
    const snap = await tdb.collection('members').where('name', '==', '김상아ttc9기').get();
    if (!snap.empty) {
        const mid = snap.docs[0].id;
        const before = snap.docs[0].data().credits;
        await tdb.collection('members').doc(mid).update({
            credits: admin.firestore.FieldValue.increment(2)
        });
        console.log(`✅ 김상아ttc9기 크레딧 복원: ${before} → ${before + 2}`);
    }

    // 최종 확인
    const attSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .get();

    let gwCount = 0, mapoCount = 0, total = 0;
    attSnap.forEach(doc => {
        const d = doc.data();
        if (d.deletedAt) return;
        total++;
        if (d.branchId === 'gwangheungchang') gwCount++;
        else if (d.branchId === 'mapo') mapoCount++;
    });

    console.log(`\n📊 최종: 광흥창 ${gwCount}명 / 마포 ${mapoCount}명 / 전체 ${total}명`);
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
