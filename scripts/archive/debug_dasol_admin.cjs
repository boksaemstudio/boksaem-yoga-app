const admin = require('firebase-admin');
const serviceAccount = require('./functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function investigate() {
    console.log("=== 1. 회원 정보 조회 (정다솔) ===");
    const memberSnap = await db.collection('members').where('name', '==', '정다솔').get();
    
    let memberIds = [];
    memberSnap.forEach(doc => {
        const data = doc.data();
        memberIds.push(doc.id);
        console.log(`ID: ${doc.id}, Name: ${data.name}, Phone: ${data.phone}, Branch: ${data.homeBranch}`);
    });

    if (memberIds.length === 0) {
        console.log("정다솔 회원을 찾을 수 없습니다.");
        return;
    }

    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    
    for (const memberId of memberIds) {
        console.log(`\n=== 2. 오늘 출석 기록 조회 (ID: ${memberId}, Date: ${today}) ===`);
        const attendanceSnap = await db.collection('attendance')
            .where('memberId', '==', memberId)
            .where('date', '==', today)
            .orderBy('timestamp', 'desc')
            .get();
        
        attendanceSnap.forEach(doc => {
            console.log(JSON.stringify({id: doc.id, ...doc.data()}, null, 2));
        });

        console.log(`\n=== 3. 전체 출석 기록 (최근 10건) ===`);
        const allAttendanceSnap = await db.collection('attendance')
            .where('memberId', '==', memberId)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        allAttendanceSnap.forEach(doc => {
            console.log(`[${doc.data().date} ${doc.data().time}] ${doc.data().itemName || doc.data().item} / ${doc.data().instructor}`);
        });

        console.log(`\n=== 4. 보류 중인 출석 (pending_attendance) ===`);
        const pendingSnap = await db.collection('pending_attendance')
            .where('memberId', '==', memberId)
            .get();
        
        pendingSnap.forEach(doc => {
            console.log(JSON.stringify({id: doc.id, ...doc.data()}, null, 2));
        });

        console.log(`\n=== 5. 에러 로그 조회 (최근 5건) ===`);
        const errorSnap = await db.collection('error_logs')
            .where('memberId', '==', memberId)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
            
        errorSnap.forEach(doc => {
            const data = doc.data();
            console.log(`[${data.timestamp}] ${data.error} | ${data.context || ''}`);
        });
    }
}

investigate().then(() => {
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
