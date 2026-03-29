const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function checkPhotos() {
    const tenantId = 'boksaem-yoga';
    console.log(`\n📸 Checking today's attendance photos for: ${tenantId}`);
    
    const today = new Date();
    const todayStr = today.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const startOfDay = new Date(`${todayStr}T00:00:00+09:00`);
    const endOfDay = new Date(`${todayStr}T23:59:59+09:00`);
    
    const attendanceRef = db.collection('studios').doc(tenantId).collection('attendance');
    
    // Query today's attendance
    const snap = await attendanceRef
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
        .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
        .get();
    
    console.log(`\n📊 오늘(${todayStr}) 전체 출석: ${snap.size}건`);
    
    let withPhoto = 0;
    let withoutPhoto = 0;
    const missingPhotoRecords = [];
    
    snap.forEach(doc => {
        const data = doc.data();
        if (data.photoUrl) {
            withPhoto++;
        } else {
            withoutPhoto++;
            const ts = data.timestamp?.toDate?.() ? data.timestamp.toDate() : new Date(data.timestamp);
            missingPhotoRecords.push({
                id: doc.id,
                memberId: data.memberId || 'unknown',
                memberName: data.memberName || data.name || 'unknown',
                time: ts.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' }),
                className: data.className || '-',
                status: data.status || '-',
                photoStatus: data.photoStatus || 'no_field',
                branchId: data.branchId || '-'
            });
        }
    });
    
    console.log(`  ✅ 사진 있음: ${withPhoto}건`);
    console.log(`  ❌ 사진 없음: ${withoutPhoto}건`);
    
    if (missingPhotoRecords.length > 0) {
        console.log('\n📋 사진 없는 출석 기록 상세:');
        console.table(missingPhotoRecords);
    }
    
    // Also check PHOTO_ENABLED setting
    const configDoc = await db.collection('studios').doc(tenantId).get();
    const config = configDoc.data();
    const photoEnabled = config?.POLICIES?.PHOTO_ENABLED || config?.settings?.POLICIES?.PHOTO_ENABLED;
    const showCameraPreview = config?.POLICIES?.SHOW_CAMERA_PREVIEW || config?.settings?.POLICIES?.SHOW_CAMERA_PREVIEW;
    const faceRecognition = config?.POLICIES?.FACE_RECOGNITION_ENABLED || config?.settings?.POLICIES?.FACE_RECOGNITION_ENABLED;
    
    console.log('\n⚙️ 사진 관련 설정:');
    console.log(`  PHOTO_ENABLED: ${photoEnabled}`);
    console.log(`  SHOW_CAMERA_PREVIEW: ${showCameraPreview}`);
    console.log(`  FACE_RECOGNITION_ENABLED: ${faceRecognition}`);
    console.log(`  → 기대 동작: photoEnabled = ${photoEnabled === true || (faceRecognition && showCameraPreview) ? 'ON' : 'OFF'}`);
    
    // Check last 7 days trend
    console.log('\n📈 최근 7일 사진 첨부율:');
    for (let d = 6; d >= 0; d--) {
        const date = new Date(today);
        date.setDate(date.getDate() - d);
        const dateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const dayStart = new Date(`${dateStr}T00:00:00+09:00`);
        const dayEnd = new Date(`${dateStr}T23:59:59+09:00`);
        
        const daySnap = await attendanceRef
            .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(dayStart))
            .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(dayEnd))
            .get();
        
        let dayWith = 0, dayWithout = 0;
        daySnap.forEach(doc => {
            if (doc.data().photoUrl) dayWith++;
            else dayWithout++;
        });
        
        const total = dayWith + dayWithout;
        const rate = total > 0 ? ((dayWith / total) * 100).toFixed(0) : '-';
        console.log(`  ${dateStr}: ${total}건 (사진 ${dayWith}건, 미첨부 ${dayWithout}건) → ${rate}%`);
    }
}

checkPhotos().catch(console.error).finally(() => process.exit(0));
