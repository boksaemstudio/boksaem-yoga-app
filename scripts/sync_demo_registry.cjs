// 데모 스튜디오 레지스트리 로고 즉시 동기화 스크립트
const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve(__dirname, '../functions/service-account-key.json'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'boksaem-yoga'
});

const db = admin.firestore();

async function syncDemoLogo() {
    // 1. 현재 스튜디오 설정에서 LOGO_URL 가져오기
    const studioDoc = await db.doc('studios/demo-yoga').get();
    const logoUrl = studioDoc.data()?.IDENTITY?.LOGO_URL || '/assets/demo_logo_v2.png';
    
    console.log('현재 Firestore IDENTITY.LOGO_URL:', logoUrl);

    // 2. 레지스트리에 동기화
    await db.doc('platform/registry/studios/demo-yoga').set({
        logoUrl: logoUrl
    }, { merge: true });

    console.log('✅ 레지스트리 logoUrl 동기화 완료:', logoUrl);
    process.exit(0);
}

syncDemoLogo().catch(e => { console.error(e); process.exit(1); });
