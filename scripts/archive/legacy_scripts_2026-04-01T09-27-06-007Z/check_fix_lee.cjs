const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAndFix() {
  const membersRef = db.collection('members');
  const snapshot = await membersRef.where('name', '==', '이청미').get();

  if (snapshot.empty) {
    console.log('Member not found.');
    return;
  }

  const memberDoc = snapshot.docs[0];
  const memberData = memberDoc.data();
  console.log(`Member: ${memberData.name}, Credits: ${memberData.credits}, ID: ${memberDoc.id}`);

  // Get today's attendance
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // Simple YYYY-MM-DD (UTC based, might need KST adjustment logic generally, but for rough check ok. Actually better to filter by timestamp range or just get recent)
  
  // Let's get recent 5 attendance records
  const attRef = db.collection('attendance');
  const attSnapshot = await attRef
    .where('memberId', '==', memberDoc.id)
    .orderBy('timestamp', 'desc')
    .limit(5)
    .get();

  console.log('Recent Attendance:');
  let todayCount = 0;
  let lastAtt = null;
  
  // KST Date string for "Today"
  const kstDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

  attSnapshot.forEach(doc => {
    const data = doc.data();
    // Check if the date matches today (KST)
    // The stored 'date' field is usually YYYY-MM-DD
    if (data.date === kstDate) {
      todayCount++;
      lastAtt = data;
    }
    console.log(`- [${data.date}] ${data.timestamp} : ${data.classTitle || 'No Title'}`);
  });

  console.log(`Today's (${kstDate}) Attendance Count: ${todayCount}`);

  if (todayCount === 1) {
    console.log('Only 1 attendance found. creating duplicate...');
    // Create duplicate attendance
    if (lastAtt) {
         const newAtt = {
             ...lastAtt,
             timestamp: new Date().toISOString(), // New timestamp
             isMultiSession: true, // Mark as multi-session just in case user wants to know
             note: 'System Correction: Mother accompanied'
         };
         await attRef.add(newAtt);
         console.log('Added 2nd attendance record.');
         
         // Deduct credit
         await membersRef.doc(memberDoc.id).update({
             credits: admin.firestore.FieldValue.increment(-1),
             attendanceCount: admin.firestore.FieldValue.increment(1)
         });
         console.log('Deducted 1 credit and incremented attendance count.');
    }
  } else if (todayCount >= 2) {
      console.log('Already has 2 or more attendance records. Checking credits...');
      // If user insists "One more deduct", maybe I should just deduct?
      // "횟수 조정해줘 한번 더 빼" -> Deduct one more.
      // But I should be careful not to double deduct if auto-deduct happened.
      // User says "이청미는 엄마때문에 두번출석한게 맞아! ... 한번 더 빼"
      // It strongly implies the system only counted 1.
      // So if I see 2 records and credits seem correct, I'll report that.
      // If I see 2 records but credits look like only 1 was deducted (hard to tell without history), I will ask or check logs.
      // BUT, usually the problem is the second check-in was BLOCKED. So 1 record exists.
  } else {
      console.log('No attendance today? This is unexpected if she came.');
  }

}

checkAndFix();
