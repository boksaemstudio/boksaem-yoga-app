/**
 * 기존 로고(logo_circle.png)를 Firestore settings/identity에 LOGO_URL로 등록
 */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'boksaem-yoga'
});

const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';
const LOGO_URL = 'https://boksaem-yoga.web.app/logo_circle.png';

async function main() {
    console.log(`📌 로고 URL 등록: ${LOGO_URL}`);
    
    // 테넌트 경로에 저장
    const tenantRef = db.doc(`studios/${STUDIO_ID}/settings/identity`);
    await tenantRef.set({ LOGO_URL }, { merge: true });
    console.log(`✅ 테넌트 경로 저장 완료: studios/${STUDIO_ID}/settings/identity`);
    
    // StudioContext에서 사용하는 studios/{studioId} 문서에도 저장
    const studioRef = db.doc(`studios/${STUDIO_ID}`);
    const studioDoc = await studioRef.get();
    if (studioDoc.exists) {
        const data = studioDoc.data();
        const identity = data.IDENTITY || {};
        identity.LOGO_URL = LOGO_URL;
        await studioRef.set({ IDENTITY: identity }, { merge: true });
        console.log(`✅ 스튜디오 문서 저장 완료: studios/${STUDIO_ID}`);
    }
    
    console.log('\n🎉 로고 등록 완료!');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
