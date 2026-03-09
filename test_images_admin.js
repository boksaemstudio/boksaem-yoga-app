const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkImages() {
  const snapshot = await db.collection('images').get();
  console.log('Total images found:', snapshot.docs.length);
  snapshot.forEach(doc => {
    console.log(doc.id, '-> keys:', Object.keys(doc.data()));
  });
  
  const settingsSnapshot = await db.collection('settings').get();
  console.log('\nTotal settings found:', settingsSnapshot.docs.length);
  settingsSnapshot.forEach(doc => {
    console.log(doc.id, '-> keys:', Object.keys(doc.data()));
  });
}
checkImages().catch(console.error);
