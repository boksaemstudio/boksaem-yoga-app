const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function deepCheck() {
    const tenantId = 'boksaem-yoga';
    console.log(`\n🔍 Deep check for: ${tenantId}`);
    
    const studioRef = db.collection('studios').doc(tenantId);
    
    // 1. Check all subcollections
    const collections = await studioRef.listCollections();
    console.log('\n📂 서브컬렉션 목록:');
    for (const col of collections) {
        const snap = await col.limit(1).get();
        const totalSnap = await col.count().get();
        console.log(`  ${col.id}: ${totalSnap.data().count}건`);
    }
    
    // 2. Check attendance collection more deeply
    console.log('\n📋 attendance 상세 확인:');
    const attSnap = await studioRef.collection('attendance')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
    
    if (attSnap.empty) {
        console.log('  ❌ attendance 컬렉션이 비어있습니다!');
    } else {
        console.log(`  최근 ${attSnap.size}건:`);
        attSnap.forEach(doc => {
            const data = doc.data();
            const ts = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
            console.log(`  - ${ts.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} | ${data.memberName || data.name || data.memberId} | photo: ${data.photoUrl ? '✅' : '❌'} | status: ${data.status || '-'}`);
        });
    }
    
    // 3. Check if PHOTO_ENABLED policies exist in nested paths
    const configDoc = await studioRef.get();
    const data = configDoc.data();
    console.log('\n⚙️ POLICIES 전체 값:');
    console.log('  top-level POLICIES:', JSON.stringify(data?.POLICIES || 'none'));
    console.log('  settings.POLICIES:', JSON.stringify(data?.settings?.POLICIES || 'none'));
    
    // 4. Show PHOTO_ENABLED evaluation
    const peTop = data?.POLICIES?.PHOTO_ENABLED;
    const peSet = data?.settings?.POLICIES?.PHOTO_ENABLED;
    const scpTop = data?.POLICIES?.SHOW_CAMERA_PREVIEW;
    const scpSet = data?.settings?.POLICIES?.SHOW_CAMERA_PREVIEW;
    const freTop = data?.POLICIES?.FACE_RECOGNITION_ENABLED;
    const freSet = data?.settings?.POLICIES?.FACE_RECOGNITION_ENABLED;
    console.log(`\n  PHOTO_ENABLED: top=${peTop}, settings=${peSet}`);
    console.log(`  SHOW_CAMERA_PREVIEW: top=${scpTop}, settings=${scpSet}`);
    console.log(`  FACE_RECOGNITION_ENABLED: top=${freTop}, settings=${freSet}`);
    
    // CheckInPage logic: photoEnabled = PHOTO_ENABLED === true || (faceRecognitionEnabled && showCameraPreview)
    // where faceRecognitionEnabled = FACE_RECOGNITION_ENABLED && SHOW_CAMERA_PREVIEW
    const fre = freTop || freSet;
    const scp = scpTop || scpSet;
    const faceEnabled = fre && scp;
    const pe = peTop || peSet;
    const finalPhotoEnabled = pe === true || faceEnabled === true;
    console.log(`  → faceRecognitionEnabled: ${faceEnabled}`);
    console.log(`  → 최종 photoEnabled: ${finalPhotoEnabled}`);
}

deepCheck().catch(console.error).finally(() => process.exit(0));
