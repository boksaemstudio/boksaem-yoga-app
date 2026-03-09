const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkData() {
  console.log("--- Checking Images ---");
  const imgSnap = await db.collection('images').get();
  imgSnap.forEach(doc => {
    console.log(doc.id, doc.data());
  });

  console.log("\n--- Checking Member 2789 ---");
  const memSnap = await db.collection('members').get();
  const members = [];
  memSnap.forEach(doc => {
      members.push({ id: doc.id, ...doc.data() });
  });
  const target = members.filter(m => m.phone && m.phone.endsWith('2789'));
  console.log('Member 2789 found:', target.map(m => ({ id: m.id, name: m.name, phone: m.phone, status: m.status, credits: m.credits })));
}
checkData().catch(console.error);
