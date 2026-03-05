const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function check() {
  const db = admin.firestore();
  
  // 1. Get member ID for "송미호"
  const memSnap = await db.collection('members').where('name', '==', '송미호').get();
  if (memSnap.empty) {
    console.log("Member 송미호 not found.");
    return;
  }
  const memberId = memSnap.docs[0].id;
  console.log(`Member found: ${memberId}, name: ${memSnap.docs[0].data().name}`);

  // 2. Check tokens in fcm_tokens
  const tokensSnap = await db.collection('fcm_tokens').where('memberId', '==', memberId).get();
  console.log(`Found ${tokensSnap.size} tokens in fcm_tokens for ${memberId}.`);
  tokensSnap.forEach(t => console.log('fcm_tokens:', t.id, t.data()));

  // 3. Check tokens in fcmTokens
  const fcmTokensSnap = await db.collection('fcmTokens').where('memberId', '==', memberId).get();
  console.log(`Found ${fcmTokensSnap.size} tokens in fcmTokens for ${memberId}.`);
  fcmTokensSnap.forEach(t => console.log('fcmTokens:', t.id, t.data()));

  // 4. Check push_tokens
  const pushTokensSnap = await db.collection('push_tokens').where('memberId', '==', memberId).get();
  console.log(`Found ${pushTokensSnap.size} tokens in push_tokens for ${memberId}.`);
  pushTokensSnap.forEach(t => console.log('push_tokens:', t.id, t.data()));

  // 5. Check recent notices
  const noticeSnap = await db.collection('notices').orderBy('createdAt', 'desc').limit(1).get();
  if (!noticeSnap.empty) {
    const notice = noticeSnap.docs[0].data();
    console.log(`Latest notice: ${notice.title} (pushStatus: ${JSON.stringify(notice.pushStatus)})`);
  }

  // 6. Check personal messages
  const msgSnap = await db.collection('messages').where('memberId', '==', memberId).orderBy('createdAt', 'desc').limit(2).get();
  console.log(`Recent personal messages for ${memberId}:`);
  msgSnap.forEach(m => console.log(m.id, m.data().content, 'pushStatus:', JSON.stringify(m.data().pushStatus)));
}

check().catch(console.error).finally(() => process.exit(0));
