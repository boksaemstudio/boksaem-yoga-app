const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function adjustCredits() {
  const membersRef = db.collection('members');
  const snapshot = await membersRef.where('name', '==', '이청미').get();

  if (snapshot.empty) {
    console.log('No matching documents.');
    return;
  }

  snapshot.forEach(async doc => {
    const data = doc.data();
    console.log(doc.id, '=>', data);
    
    // Deduct 1 credit
    const currentCredits = parseInt(data.credits, 10);
    const newCredits = currentCredits - 1;

    console.log(`Current Credits: ${currentCredits}, New Credits: ${newCredits}`);

    await membersRef.doc(doc.id).update({ credits: newCredits });
    console.log(`Updated credits for ${doc.id}`);
  });
}

adjustCredits();
