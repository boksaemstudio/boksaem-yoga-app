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
      const attRef = db.collection('attendance');
      const attSnapshot = await attRef.orderBy('timestamp', 'desc').limit(20).get();
      
      console.log("=== Recent Attendance Logs ===");
      attSnapshot.forEach(doc => {
          const data = doc.data();
          const time = new Date(data.timestamp).toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'});
          console.log(`[${time}] Name: ${data.memberName || data.name} | Status: ${data.status} | PhotoStatus: ${data.photoStatus || 'N/A'} | PhotoURL: ${data.photoUrl ? 'YES' : 'NO'}`);
      });
  } catch (err) {
      console.error(err);
  } finally {
      process.exit(0);
  }
}

main();
