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
    const snapshot = await db.collection('members').where('name', '==', '조수형').get();
    if (snapshot.empty) {
      console.log('User 조수형 not found');
      return;
    }
    
    snapshot.forEach(doc => {
      console.log('--- MEMBER RECORD ---');
      console.log('ID:', doc.id);
      console.log('Data:', JSON.stringify(doc.data(), null, 2));
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
