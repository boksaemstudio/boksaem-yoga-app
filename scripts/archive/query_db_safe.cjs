const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const accountKeyPath = path.resolve(__dirname, 'functions', 'service-account-key.json');

try {
  const serviceAccount = require(accountKeyPath);
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  async function checkNow() {
    console.log('[Members] Checking for 5572...');
    const memberSnap = await db.collection('members').where('phoneLast4', '==', '5572').get();
    memberSnap.forEach(d => console.log('Member:', d.id, d.data().name, d.data().phoneLast4));
    
    console.log('\n[Login Failures] Checking recent...');
    const loginSnap = await db.collection('login_failures').orderBy('timestamp', 'desc').limit(20).get();
    loginSnap.forEach(d => {
       const data = d.data();
       if (data.attemptedPhone === '5572' || (data.attemptedName && data.attemptedName.includes('박세희'))) {
          console.log('Login Fail:', d.id, data.attemptedName, data.attemptedPhone, data.timestamp, data.errorMessage);
       }
    });
    
    console.log('\n[Attendance Today]');
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const todaySnap = await db.collection('attendance')
        .where('date', '==', todayStr)
        .get();
    todaySnap.forEach(d => {
        const data = d.data();
        if((data.memberName && data.memberName.includes('박세희')) || data.phoneLast4 === '5572') {
            console.log('ATTENDANCE:', d.id, data.time, data.className, data.timestamp);
        }
    });

    console.log('\n[Pending Attendance]');
    const pendingSnap = await db.collection('pending_attendance').get();
    pendingSnap.forEach(d => {
        const data = d.data();
        if((data.memberName && data.memberName.includes('박세희')) || data.phoneLast4 === '5572') {
            console.log('PENDING:', d.id, data.timestamp);
        }
    });

    process.exit(0);
  }
  
  checkNow().catch(console.error);

} catch (e) {
  console.log("Could not establish DB connection: ", e.message);
}
