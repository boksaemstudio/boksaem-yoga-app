
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'functions', 'service-account-key.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkDenied() {
  console.log('--- Checking Denied Attendance for 2026-02-24 ---');
  const deniedSnap = await db.collection('attendance')
    .where('date', '==', '2026-02-24')
    .where('status', '==', 'denied')
    .get();

  if (deniedSnap.empty) {
    console.log('No denied records found for 2026-02-24.');
  } else {
    deniedSnap.forEach(doc => {
      const d = doc.data();
      console.log(`[${d.timestamp}] Member: ${d.memberName}, Class: ${d.className}, Reason: ${d.reason || 'None'}`);
    });
  }
  console.log('--- End of Denied Check ---');
}

checkDenied().catch(console.error);
