const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkMember() {
  const snapshot = await db.collection('members').get();
  
  let found = [];
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.phoneLast4 === '0249' || (data.phoneLast4 && data.phoneLast4.includes('249'))) {
      found.push(data);
    }
  });
  
  console.log('Found members with 249:', found.length);
  found.forEach(m => console.log(m.name, m.phoneLast4, m.credits, m.endDate));
  process.exit(0);
}

checkMember();
