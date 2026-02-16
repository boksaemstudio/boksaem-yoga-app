const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'service-account-key.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkRecentAttendance() {
    console.log('=== 최근 출석 데이터 진단 ===');
    
    // 1. Check 'attendance' collection (Latest 10)
    console.log('\n[1] attendance 컬렉션 (최신 10건):');
    const attSnap = await db.collection('attendance')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();

    if (attSnap.empty) {
        console.log(' -> 데이터 없음');
    } else {
        attSnap.docs.forEach(doc => {
            const data = doc.data();
            console.log(` - [${data.memberName}] ${data.date} / ${data.className} / ${data.instructor} / ${data.branchId} / ${data.status} / (${data.timestamp})`);
        });
    }

    // 2. Check 'pending_attendance' collection (Offline/Sync issues)
    console.log('\n[2] pending_attendance 컬렉션 (미동기화 데이터):');
    const pendingSnap = await db.collection('pending_attendance').get();
    
    if (pendingSnap.empty) {
        console.log(' -> 대기 중인 데이터 없음 (정상)');
    } else {
        pendingSnap.docs.forEach(doc => {
            const data = doc.data();
            console.log(` ⚠️ [${data.memberName}] ${data.date} / ${data.className} / ${data.instructor} / timestamp: ${data.timestamp}`);
        });
    }

    // 3. Check specific member if provided (Optional)
    // You can hardcode a name here if user provides one later
}

checkRecentAttendance();
