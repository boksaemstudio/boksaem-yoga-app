const admin = require('firebase-admin');
const serviceAccount = require('./functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkSystemWide() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    console.log(`=== 시스템 현황 조사 (Date: ${today}) ===`);

    console.log("\n--- 1. 오늘 전체 출석 통계 ---");
    const attSnap = await db.collection('attendance').where('date', '==', today).get();
    console.log(`총 출석 건수: ${attSnap.size}`);
    
    const logs = [];
    attSnap.forEach(doc => logs.push(doc.data()));
    logs.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));

    console.log("\n--- 2. 오늘 출석 시간대별 분포 (최근 50건) ---");
    logs.slice(-50).forEach(data => {
        console.log(`[${data.timestamp}] ${data.memberName} | ${data.branchId} | ${data.className} (${data.status})`);
    });

    console.log("\n--- 3. 오늘 발생한 모든 에러 로그 (error_logs) ---");
    // ISO 8601 형식으로 오늘 자정 이후 에러 조회
    const todayMidnight = new Date();
    todayMidnight.setHours(0,0,0,0);
    const todayStr = todayMidnight.toISOString();

    const errSnap = await db.collection('error_logs')
        .where('timestamp', '>=', todayStr)
        .orderBy('timestamp', 'desc')
        .get();
    
    console.log(`오늘 발생한 에러 총합: ${errSnap.size}`);
    errSnap.forEach(doc => {
        const data = doc.data();
        console.log(`[${data.timestamp}] ${data.error} | Context: ${data.context || 'N/A'}`);
    });

    console.log("\n--- 4. 보류 중인 전체 출석 (pending_attendance) ---");
    const pendingSnap = await db.collection('pending_attendance').get();
    console.log(`보류 중인 총 건수: ${pendingSnap.size}`);
    pendingSnap.forEach(doc => {
        const data = doc.data();
        console.log(`[${data.timestamp}] ${data.memberName} | Branch: ${data.branchId} | Reason: ${data.reason || 'N/A'}`);
    });
}

checkSystemWide().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
