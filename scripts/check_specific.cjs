const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const TENANT = 'studios/boksaem-yoga';

async function check() {
  for (const name of ['이제민', '김민지']) {
    const snap = await db.collection(`${TENANT}/members`).where('name', '==', name).get();
    console.log(`\n=== ${name}: ${snap.size}건 ===`);
    snap.docs.forEach(doc => {
      const d = doc.data();
      console.log(`  ID: ${doc.id}`);
      console.log(`  membershipType: ${d.membershipType}`);
      console.log(`  branchId: ${d.branchId}`);
      console.log(`  credits: ${d.credits}`);
      console.log(`  endDate: ${d.endDate}`);
    });
  }
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
