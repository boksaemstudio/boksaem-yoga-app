const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function verifyLee() {
  const membersRef = db.collection('members');
  const snapshot = await membersRef.where('name', '==', '이청미').get();
  
  if (snapshot.empty) return;
  const m = snapshot.docs[0].data();
  console.log(`Member: ${m.name}, Credits: ${m.credits}`);

  const kstDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  const attRef = db.collection('attendance');
  const attSnap = await attRef
      .where('memberId', '==', snapshot.docs[0].id)
      .where('date', '==', kstDate)
      .get();
  
  console.log(`Today's Attendance Records: ${attSnap.size}`);
  attSnap.forEach(doc => {
      console.log(`- ${doc.data().timestamp} (Note: ${doc.data().note || 'None'})`);
  });
}

verifyLee();
