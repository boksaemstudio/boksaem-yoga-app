const admin = require('firebase-admin');
const serviceAccount = require('./functions/service-account-key.json');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function check() {
  const c1 = await db.collection('fcm_tokens').get();
  const c2 = await db.collection('fcmTokens').get();
  const c3 = await db.collection('push_tokens').get();
  
  console.log(`fcm_tokens: ${c1.size}, fcmTokens: ${c2.size}, push_tokens: ${c3.size}`);
  
  let allTokens = [];
  [c1, c2, c3].forEach(snap => {
    snap.forEach(d => {
      const data = d.data();
      if (data.memberId) allTokens.push(data.memberId);
    });
  });
  
  const uniqueMembers = new Set(allTokens);
  console.log('Unique memberIds across all collections:', uniqueMembers.size);
  
  // Check the pushEnabled status of that member
  for(let memId of uniqueMembers) {
     const doc = await db.collection('members').doc(memId).get();
     if(doc.exists) {
         console.log('Member:', doc.data().name, 'pushEnabled:', doc.data().pushEnabled);
     }
  }
  process.exit(0);
}
check();
