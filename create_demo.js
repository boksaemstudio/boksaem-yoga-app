const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createDemo() {
  try {
    const user = await admin.auth().createUser({
      email: 'demo@passflow.kr',
      password: 'passflowdemo!',
      displayName: 'PassFlow Demo Admin'
    });
    
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'admin',
      studioId: 'demo-yoga'
    });
    
    console.log('Demo user created successfully:', user.uid);
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      const u = await admin.auth().getUserByEmail('demo@passflow.kr');
      await admin.auth().setCustomUserClaims(u.uid, {
        role: 'admin',
        studioId: 'demo-yoga'
      });
      console.log('Claims updated for existing demo user');
    } else {
      console.error(err);
    }
  }
}

createDemo();
