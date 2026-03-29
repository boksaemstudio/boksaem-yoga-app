const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const acc = require('../functions/service-account-key.json');

initializeApp({ credential: cert(acc) });
const db = getFirestore();

async function run() {
  const tdb = db.collection('studios').doc('passflow-demo');
  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  
  console.log('\n--- Individual Messages (Today) ---');
  const msgSnap = await tdb.collection('messages').where('timestamp', '>=', startOfToday.toISOString()).get();
  for (const doc of msgSnap.docs) {
      console.log(doc.id, '=>', doc.data().smsStatus);
  }

  console.log('\n--- Bulk Approvals (Today) ---');
  const bulkSnap = await tdb.collection('message_approvals').where('createdAt', '>=', startOfToday).get();
  for (const doc of bulkSnap.docs) {
      console.log(doc.id, '=>', doc.data().status, doc.data().smsStatus);
  }
}

run().then(() => process.exit(0)).catch(console.error);
