const admin = require('firebase-admin');
const path = require('path');
const serviceAccountPath = path.resolve(__dirname, '../../service-account-key.json');
try {
  const serviceAccount = require(serviceAccountPath);
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
  if (!admin.apps.length) admin.initializeApp();
}
const db = admin.firestore();

async function check() {
    console.log('--- SALES COLLECTION ---');
    const salesSnap = await db.collection('sales').where('memberId', '==', 'SwagRQBqMAOODaRSPm4j').get();
    salesSnap.docs.forEach(doc => console.dir({ id: doc.id, ...doc.data() }, {depth: null}));

    console.log('--- MEMBER DOCUMENT ---');
    const memberDoc = await db.collection('members').doc('SwagRQBqMAOODaRSPm4j').get();
    if(memberDoc.exists) {
        const d = memberDoc.data();
        console.dir({ id: memberDoc.id, name: d.name, amount: d.amount, regDate: d.regDate, credits: d.credits }, {depth: null});
    }

    process.exit(0);
}
check();
