const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function enablePhoto() {
    // boksaem-yoga: 실제 운영 환경 — 기존에 항상 ON이었으므로 DB에 명시적으로 true 설정
    const tenantId = 'boksaem-yoga';
    console.log(`\n📸 Enabling PHOTO_ENABLED for: ${tenantId}`);
    
    const tenantDoc = db.collection('studios').doc(tenantId);
    await tenantDoc.update({
        'POLICIES.PHOTO_ENABLED': true
    });
    
    // 확인
    const doc = await tenantDoc.get();
    const data = doc.data();
    console.log(`✅ PHOTO_ENABLED: ${data?.POLICIES?.PHOTO_ENABLED}`);
    console.log(`   SHOW_CAMERA_PREVIEW: ${data?.POLICIES?.SHOW_CAMERA_PREVIEW}`);
    console.log(`   FACE_RECOGNITION_ENABLED: ${data?.POLICIES?.FACE_RECOGNITION_ENABLED}`);
    
    // CheckInPage 판단 로직 재현
    const faceRecognitionEnabled = data?.POLICIES?.FACE_RECOGNITION_ENABLED && data?.POLICIES?.SHOW_CAMERA_PREVIEW;
    const photoEnabled = data?.POLICIES?.PHOTO_ENABLED === true || faceRecognitionEnabled === true;
    console.log(`\n   → 최종 photoEnabled: ${photoEnabled} ✅`);
}

enablePhoto().catch(console.error).finally(() => process.exit(0));
