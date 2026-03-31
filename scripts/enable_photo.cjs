const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    // PHOTO_ENABLED만 true로 변경 (안면인식은 false 유지)
    await tdb.update({
        'POLICIES.PHOTO_ENABLED': true
    });
    
    console.log('✅ PHOTO_ENABLED: true 로 변경 완료');
    console.log('  → 안면인식(FACE_RECOGNITION_ENABLED)은 false 유지');
    console.log('  → 출석 시 배경에서 자동으로 사진이 찍힙니다');

    // 확인
    const doc = await tdb.get();
    const p = doc.data().POLICIES;
    console.log(`\n현재 설정:`);
    console.log(`  PHOTO_ENABLED: ${p.PHOTO_ENABLED}`);
    console.log(`  FACE_RECOGNITION_ENABLED: ${p.FACE_RECOGNITION_ENABLED}`);

    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
