const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function check() {
  const db = admin.firestore();
  
  console.log("Fetching latest notices...");
  const noticeSnap = await db.collection('notices').orderBy('timestamp', 'desc').limit(2).get();
  
  if (noticeSnap.empty) {
    console.log("No notices found.");
    return;
  }
  
  noticeSnap.forEach(d => {
     console.log('Notice:', d.id, d.data().title, 'pushStatus:', JSON.stringify(d.data().pushStatus), 'sendPush:', d.data().sendPush);
  });
}

check().catch(console.error).finally(() => process.exit(0));
