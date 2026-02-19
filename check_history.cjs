
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'functions', 'service-account-key.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkAttendanceHistory() {
  console.log('--- Attendance Logs for the last 24 hours ---');
  const yesterday = new Date(Date.now() - 24 * 60 * 1000 * 60).toISOString();
  
  const snapshot = await db.collection('attendance')
    .where('timestamp', '>=', yesterday)
    .orderBy('timestamp', 'desc')
    .get();

  console.log(`Total logs in last 24h: ${snapshot.size}`);
  snapshot.forEach(doc => {
    const d = doc.data();
    console.log(`- [${d.timestamp}] Date: ${d.date}, Name: ${d.memberName || d.memberId}, Status: ${d.status || 'valid'}`);
  });
  
  // Also check members to see if '복샘요가원' exists multiple times or has issues
  const memberSnap = await db.collection('members').where('name', '==', '복샘요가원').get();
  console.log(`'복샘요가원' members found: ${memberSnap.size}`);
  memberSnap.forEach(doc => {
      console.log(`ID: ${doc.id}, Data:`, JSON.stringify(doc.data(), null, 2));
  });
}

checkAttendanceHistory().catch(console.error);
