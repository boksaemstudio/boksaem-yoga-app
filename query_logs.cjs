const admin = require('firebase-admin');
const serviceAccount = require('./functions/serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
  console.log("Checking login_failures array...");
  const snap = await db.collection('login_failures').orderBy('timestamp', 'desc').limit(20).get();
  snap.forEach(doc => {
      const data = doc.data();
      if(JSON.stringify(data).includes('5572') || JSON.stringify(data).includes('박세희')) {
          console.log(doc.id, data);
      }
  });
  
  console.log("Checking attendance for today...");
  const todaySnap = await db.collection('attendance')
    .where('date', '==', new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }))
    .get();
  todaySnap.forEach(doc => {
      const data = doc.data();
      if(data.memberName === '박세희' || data.phoneLast4 === '5572') {
          console.log("ATTENDANCE:", doc.id, data);
      }
  });

  console.log("Checking pending_attendance...");
  const pendingSnap = await db.collection('pending_attendance').get();
  pendingSnap.forEach(doc => {
      const data = doc.data();
      if(data.memberName === '박세희' || data.phoneLast4 === '5572') {
          console.log("PENDING:", doc.id, data);
      }
  });
}
run().catch(console.error);
