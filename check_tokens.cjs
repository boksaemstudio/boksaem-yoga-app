const admin = require('firebase-admin');
const serviceAccount = require('./functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
  const snap = await db.collection('fcm_tokens').get();
  console.log('fcm_tokens total size:', snap.size);
  let memberTokens = [];
  snap.forEach(d => {
    const data = d.data();
    if (data.memberId) {
      memberTokens.push(data.memberId);
    }
  });
  console.log('Tokens with memberId:', memberTokens.length);
  const uniqueMembers = new Set(memberTokens);
  console.log('Unique memberIds with tokens:', uniqueMembers.size);
  process.exit(0);
}

run();
