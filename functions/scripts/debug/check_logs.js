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
      .where('memberId', '==', 'nTWsSpnCTr1464ibRtwx')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();
      
    logs.forEach(doc => {
      console.log('--- LOG ---');
      console.log('ID:', doc.id);
      console.log(JSON.stringify(doc.data(), null, 2));
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
