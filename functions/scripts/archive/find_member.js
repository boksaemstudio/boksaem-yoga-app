
const admin = require("firebase-admin");
const serviceAccount = require("../service-account-key.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function findMember(namePrefix) {
  console.log(`Searching for member starting with: ${namePrefix}`);
  const snapshot = await db.collection('members')
    .where('name', '>=', namePrefix)
    .where('name', '<=', namePrefix + '\uf8ff')
    .get();
  
  if (snapshot.empty) {
    console.log('No matching documents.');
    return;
  }

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Found: ${data.name} (ID: ${doc.id})`);
    console.log(`Credits: ${data.credits}`);
    console.log(`EndDate: ${data.endDate}`);
  });
}

findMember('복샘');
