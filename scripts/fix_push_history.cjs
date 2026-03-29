const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../functions/service-account-key.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const tdb = db.collection('studios').doc('passflow-demo');
  const snap = await tdb.collection('push_history').get();
  
  let count = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (data.type === 'sms_msg' && !data.createdAt && data.sentAt) {
      await d.ref.update({ createdAt: data.sentAt });
      count++;
    }
  }
  
  console.log('Fixed', count, 'push_history docs');
  process.exit(0);
}

run().catch(console.error);
