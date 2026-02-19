
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkRecentAttendance() {
  const fiveMinutesAgo = new Date(Date.now() - 10 * 60 * 1000); // 10분 전부터 넉넉히 확인
  console.log('Checking logs since:', fiveMinutesAgo.toISOString());

  const snapshot = await db.collection('attendance')
    .where('timestamp', '>=', fiveMinutesAgo.toISOString())
    .orderBy('timestamp', 'desc')
    .get();

  if (snapshot.empty) {
    console.log('No recent attendance logs found.');
    return;
  }

  console.log(`Found ${snapshot.size} recent logs:`);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`- [${data.timestamp}] Member: ${data.memberId}, Branch: ${data.branchId}, Status: ${data.status || 'valid'}, Reason: ${data.denialReason || 'N/A'}`);
  });
}

checkRecentAttendance().catch(console.error);
