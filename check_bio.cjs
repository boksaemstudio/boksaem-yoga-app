const admin = require('firebase-admin');
const serviceAccount = require('./functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';

async function checkFaces() {
  const bioRef = db.collection(`studios/${STUDIO_ID}/face_biometrics`);
  const allBio = await bioRef.get();

  let count = allBio.size;
  const facedMembers = [];

  for (const doc of allBio.docs) {
    facedMembers.push(doc.id);
  }
  
  console.log(`\n=== Total members in face_biometrics: ${count} ===`);
  if (count > 0) {
      console.log('Member IDs:', facedMembers.join(', '));
  }
  
  process.exit(0);
}

checkFaces().catch(e => { console.error(e); process.exit(1); });
