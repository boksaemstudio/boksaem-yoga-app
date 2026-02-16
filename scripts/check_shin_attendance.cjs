const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAttendance() {
  const membersRef = db.collection('members');
  const snapshot = await membersRef.where('name', '==', '신보영').get();

  if (snapshot.empty) {
    console.log('Member not found.');
    return;
  }

  const memberDoc = snapshot.docs[0];
  console.log(`Member: ${memberDoc.data().name}, ID: ${memberDoc.id}`);

  const today = new Date();
  const kstDate = today.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

  const attRef = db.collection('attendance');
  const attSnapshot = await attRef
    .where('memberId', '==', memberDoc.id)
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get();

  console.log(`Searching for attendance on ${kstDate}...`);
  
  if (attSnapshot.empty) {
      console.log("No attendance records found.");
  }

  attSnapshot.forEach(doc => {
    const data = doc.data();
    // Convert timestamp to KST readable string
    const dateObj = new Date(data.timestamp);
    const timeStr = dateObj.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' });
    
    // Check if it's today
    if (data.date === kstDate) {
        console.log(`- [TODAY] ${timeStr} (Class: ${data.classTitle})`);
    } else {
        console.log(`- [PAST] ${data.date} ${timeStr}`);
    }
  });

  console.log('\nChecking pending_attendance...');
  const pendingRef = db.collection('pending_attendance');
  const pendingSnap = await pendingRef
    .where('memberId', '==', memberDoc.id)
    .get();

  if (pendingSnap.empty) {
      console.log("No pending attendance records found.");
  } else {
      pendingSnap.forEach(doc => {
          const data = doc.data();
          const dateObj = new Date(data.timestamp);
          const timeStr = dateObj.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' });
          console.log(`- [PENDING] ${timeStr} (Status: ${data.status})`);
      });
  }
}

checkAttendance();
