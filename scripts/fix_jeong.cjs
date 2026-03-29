const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function fix() {
  const membersSnap = await db.collection('studios/boksaem-yoga/members').where('name', '==', '정계수').get();
  if (membersSnap.empty) { 
    console.log('No 정계수 found.'); 
    process.exit(0); 
  }
  for (const doc of membersSnap.docs) {
    console.log('Found 정계수:', doc.id);
    await db.doc(`studios/boksaem-yoga/face_biometrics/${doc.id}`).delete();
    await doc.ref.update({ 
      hasFaceDescriptor: false, 
      faceUpdatedAt: admin.firestore.FieldValue.delete() 
    });
    console.log('Deleted face biometrics for', doc.id);
  }
  process.exit(0);
}
fix();
