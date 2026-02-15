const admin = require('firebase-admin');
const serviceAccount = require('./functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkSystemWide() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    console.log(`=== 시스템 현황 조사 (Date: ${today}) ===`);

    const todayMidnight = new Date();
    todayMidnight.setHours(0,0,0,0);
    const todayStr = todayMidnight.toISOString();

    console.log("\n--- 1. 오늘 발생한 모든 에러 로그 (error_logs) ---");
    const errSnap = await db.collection('error_logs')
        .where('timestamp', '>=', todayStr)
        .orderBy('timestamp', 'desc')
        .get();
    
    console.log(`오늘 발생한 에러 총합: ${errSnap.size}`);
    errSnap.forEach(doc => {
        const data = doc.data();
        console.log(`[${data.timestamp}] MSG: ${data.message} | CONTEXT: ${JSON.stringify(data.context || {})}`);
    });

    console.log("\n--- 2. 오늘 출석 분포 (최근 50건) ---");
    const attSnap = await db.collection('attendance').where('date', '==', today).get();
    const logs = [];
    attSnap.forEach(doc => logs.push(doc.data()));
    logs.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
    logs.slice(-50).forEach(data => {
        console.log(`[${data.timestamp}] ${data.memberName} | ${data.branchId} | ${data.className} (${data.status})`);
    });
}

checkSystemWide().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
