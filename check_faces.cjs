const admin = require('firebase-admin');
const serviceAccount = require('./functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';

async function checkFaces() {
  const membersRef = db.collection(`studios/${STUDIO_ID}/members`);
  const allMembers = await membersRef.get();

  let count = 0;
  const facedMembers = [];

  for (const doc of allMembers.docs) {
    const d = doc.data();
    if (d.faceDescriptor || (d.faceDescriptors && d.faceDescriptors.length > 0)) {
      count++;
      facedMembers.push(`${d.name} (${d.phone})`);
    }
  }
  
  console.log(`\n=== Total members with faces: ${count} ===`);
  if (count > 0) {
      console.log('Members:', facedMembers.join(', '));
  }
  
  process.exit(0);
}

checkFaces().catch(e => { console.error(e); process.exit(1); });
