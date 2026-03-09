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
    const logs = await db.collection('attendance')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
      
    logs.forEach(doc => {
      console.log('---', doc.id, '---');
      const data = doc.data();
      console.log(data.memberName, data.date, data.timestamp, data.type);
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
