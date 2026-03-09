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
    const memberId = 'nTWsSpnCTr1464ibRtwx';
    const memberRef = db.collection('members').doc(memberId);
    
    // Simulate what the cloud function does
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(memberRef);
      if (!snap.exists) throw new Error('Not found');
      // let's just log her data to make sure no fields cause exceptions
      console.log(snap.data());
    });
  } catch(e) { console.error(e) }
  process.exit(0);
}
main();
