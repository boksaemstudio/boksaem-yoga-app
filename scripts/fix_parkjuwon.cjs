const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    const docId = 'gwang_restored_O6cU7IEOpFAVY9X0DTVv';

    // 1. attendance에서 삭제
    const attDoc = await tdb.collection('attendance').doc(docId).get();
    if (attDoc.exists) {
        await tdb.collection('attendance').doc(docId).delete();
        console.log(`✅ attendance/${docId} 삭제 완료`);
    } else {
        console.log(`⚠️ attendance/${docId} 이미 없음`);
    }

    // 2. practice_events에서 삭제
    const peDoc = await tdb.collection('practice_events').doc(docId).get();
    if (peDoc.exists) {
        await tdb.collection('practice_events').doc(docId).delete();
        console.log(`✅ practice_events/${docId} 삭제 완료`);
    } else {
        console.log(`⚠️ practice_events/${docId} 이미 없음`);
    }

    // 3. 크레딧 복원 (복구 시 1 차감되었으므로)
    const memberId = 'ayVth1VwZ8EmDq7UZmBH';
    const memberDoc = await tdb.collection('members').doc(memberId).get();
    if (memberDoc.exists) {
        const current = memberDoc.data();
        console.log(`\n👤 박주원 현재 크레딧: ${current.credits}`);
        // 복구 스크립트가 크레딧을 차감했을 수 있으므로 +1 복원
        await tdb.collection('members').doc(memberId).update({
            credits: admin.firestore.FieldValue.increment(1)
        });
        console.log(`✅ 크레딧 +1 복원 (${current.credits} → ${current.credits + 1})`);
    }

    console.log('\n🧹 박주원 잘못된 복구 기록 정리 완료');
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
