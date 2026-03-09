const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function main() {
  try {
    const logs = await db.collection('pending_attendance')
      .get();
      
    logs.forEach(doc => {
      console.log('--- PENDING ---', doc.id, '---');
      const data = doc.data();
      console.log(data.memberName, data.date, data.timestamp, data.status);
    });
    
    // Also check what 'lastAttendance' is exactly
    const member = await db.collection('members').doc('nTWsSpnCTr1464ibRtwx').get();
    console.log('lastAttendance:', member.data().lastAttendance);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
