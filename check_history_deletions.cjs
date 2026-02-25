
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'functions', 'service-account-key.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkHistory() {
  console.log('--- Checking Attendance History for Deletions ---');
  const historySnap = await db.collection('attendance_history')
    .orderBy('timestamp', 'desc')
    .limit(50)
    .get();

  historySnap.forEach(doc => {
    const data = doc.data();
    if (data.action === 'delete' || data.action === '삭제') {
      console.log(`[${data.timestamp}] Action: ${data.action}, Member: ${data.memberName}, Class: ${data.className}, Date: ${data.date}`);
    }
  });
  console.log('--- End of History Check ---');
}

checkHistory().catch(console.error);
