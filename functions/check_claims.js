const admin = require('firebase-admin');
const path = require('path');
process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: 'boksaem-yoga' });
admin.initializeApp({ projectId: 'boksaem-yoga' });

async function check() {
  try {
    const user = await admin.auth().getUserByEmail('biksoon@daum.net');
    console.log('User UID:', user.uid);
    console.log('Custom Claims:', user.customClaims);
  } catch (e) {
    console.error(e);
  }
}
check();
