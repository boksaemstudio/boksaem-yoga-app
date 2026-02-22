const admin = require('firebase-admin');
const serviceAccount = require('./functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
  try {
    console.log('[Phase 1] Checking fcm_tokens');
    const tokenSnap = await db.collection('fcm_tokens').get();
    console.log(`Total FCM tokens: ${tokenSnap.size}`);
    
    let adminCount = 0;
    let instructorCount = 0;
    
    tokenSnap.forEach(doc => {
      const data = doc.data();
      console.log(`Token [${doc.id.substring(0,8)}...]: role=${data.role} adminId=${data.adminId} instructorName=${data.instructorName}`);
      if (data.role === 'admin') adminCount++;
      if (data.role === 'instructor') instructorCount++;
    });

    console.log(`Admins registered: ${adminCount}`);
    console.log(`Instructors registered: ${instructorCount}`);
    
    console.log('\n[Phase 2] Checking members collection for admin/instructor settings');
    // Check if any member has role = 'instructor'
    const instructorMembers = await db.collection('members').where('role', '==', 'instructor').get();
    console.log(`Members with role 'instructor': ${instructorMembers.size}`);
    instructorMembers.forEach(d => console.log(d.id, d.data().name, d.data().pushEnabled));
    
    // Check members table just by keyword
    const allMembers = await db.collection('members').get();
    let instructorKeywordCount = 0;
    allMembers.forEach(d => {
       const m = d.data();
       if (m.name && (m.name.includes('강사') || m.name.includes('선생님') || m.name.includes('보라') || m.name.includes('원경'))) {
           if (m.role) return; // already counted
           console.log(`Possible Instructor: ${m.name} [${d.id}] pushEnabled=${m.pushEnabled} role=${m.role}`);
       }
    });

  } catch (err) {
    console.error('Script Error:', err);
  }
}

run();
