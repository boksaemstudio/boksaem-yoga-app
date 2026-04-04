const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixRegistry() {
  try {
    await db.doc('platform/registry/studios/ssangmun-yoga').update({
      ownerEmail: 'ssangmun@gmail.com'
    });
    console.log('Fixed ssangmun@gmail.com');

    await db.doc('platform/registry/studios/boksaem-yoga').update({
      ownerEmail: 'biksoon@daum.net'
    });
    console.log('Fixed biksoon@daum.net');

    await db.doc('platform/registry/studios/demo-yoga').update({
        ownerEmail: 'biksoon@daum.net'
      });
      console.log('Fixed demo-yoga to biksoon@daum.net');

    console.log('All registries updated correctly!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixRegistry();
