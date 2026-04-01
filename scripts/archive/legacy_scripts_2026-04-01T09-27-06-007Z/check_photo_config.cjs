const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    console.log('='.repeat(60));
    console.log('  카메라/사진 관련 설정 확인');
    console.log('='.repeat(60));

    const settingsDoc = await tdb.collection('settings').doc('config').get();
    if (settingsDoc.exists) {
        const config = settingsDoc.data();
        const policies = config.POLICIES || {};
        console.log('\n📋 POLICIES 전체:');
        console.log(JSON.stringify(policies, null, 2));
        console.log(`\n🔑 PHOTO_ENABLED: ${policies.PHOTO_ENABLED}`);
        console.log(`🔑 FACE_RECOGNITION_ENABLED: ${policies.FACE_RECOGNITION_ENABLED}`);
        console.log(`🔑 SHOW_CAMERA_PREVIEW: ${policies.SHOW_CAMERA_PREVIEW}`);
    } else {
        console.log('❌ settings/config 문서가 없습니다');
    }

    // 오늘 출석에 사진이 있는지 확인
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const attSnap = await tdb.collection('attendance')
        .where('date', '==', todayStr)
        .limit(10)
        .get();

    console.log(`\n📷 오늘(${todayStr}) 출석 사진 여부:`);
    attSnap.forEach(doc => {
        const d = doc.data();
        console.log(`  ${d.memberName || '?'} | photoUrl: ${d.photoUrl ? '✅ 있음' : '❌ 없음'}`);
    });

    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
