
const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkPhoneIntegrity() {
  console.log("Checking member phone integrity...");
  const snapshot = await db.collection('members').get();
  
  let total = 0;
  let missingPhoneLast4 = 0;
  let missingPhoneAndLast4 = 0;
  let hasPhoneButMissingLast4 = 0;
  let examples = [];

  snapshot.forEach(doc => {
    total++;
    const data = doc.data();
    const hasPhone = data.phone && data.phone.trim().length > 0;
    const hasLast4 = data.phoneLast4 && data.phoneLast4.trim().length > 0;

    if (!hasLast4) {
      missingPhoneLast4++;
      if (hasPhone) {
        hasPhoneButMissingLast4++;
         if (examples.length < 5) {
            examples.push({ id: doc.id, name: data.name, phone: data.phone });
         }
      } else {
        missingPhoneAndLast4++;
      }
    }
  });

  console.log(`Total Members: ${total}`);
  console.log(`Missing phoneLast4: ${missingPhoneLast4}`);
  console.log(`Has Phone but Missing Last4 (Fixable): ${hasPhoneButMissingLast4}`);
  console.log(`Missing Phone AND Last4 (Critical): ${missingPhoneAndLast4}`);
  
  if (examples.length > 0) {
      console.log("Examples of fixable members:");
      examples.forEach(e => console.log(`- ${e.name} (${e.phone})`));
  }
}

checkPhoneIntegrity().catch(console.error);
