
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'functions', 'service-account-key.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function deepInvestigate() {
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  console.log(`Checking all logs for today: ${todayStr}`);

  const snapshot = await db.collection('attendance')
    .where('date', '==', todayStr)
    .get();

  if (snapshot.empty) {
    console.log('No attendance logs found for today.');
  } else {
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // 팁계: 총 로그 수
    console.log(`Total logs today: ${logs.length}`);

    // 최근 20분간의 로그 (현재 시간 09:30 기준 09:10 이후)
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const recentLogs = logs.filter(l => l.timestamp >= twentyMinutesAgo);
    
    console.log(`--- Logs in the last 20 minutes (${twentyMinutesAgo} ~ ) ---`);
    recentLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    recentLogs.forEach(l => {
      console.log(`- [${l.timestamp}] Member: ${l.memberName || l.memberId}, Branch: ${l.branchId}, Status: ${l.status || 'valid'}, Reason: ${l.denialReason || 'N/A'}`);
      if ((l.memberName || '').includes('복샘요가')) {
          console.log('  -> Details:', JSON.stringify(l, null, 2));
      }
    });

    // 특정하게 '복샘요가원' 검색
    const boksaemLogs = logs.filter(l => (l.memberName || '').includes('복샘요가원') || l.memberId === 'd5dOhmZNi8wTm7iCFPlB');
    console.log(`--- All logs for '복샘요가원' today ---`);
    boksaemLogs.forEach(l => {
       console.log(`- [${l.timestamp}] Status: ${l.status || 'valid'}, Branch: ${l.branchId}`);
    });
  }
}

deepInvestigate().catch(console.error);
