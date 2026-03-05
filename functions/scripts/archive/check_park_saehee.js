const admin = require("firebase-admin");
const serviceAccount = require("../service-account-key.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function investigateYesterday() {
  console.log("Investigating yesterday (2026-02-27) for '박세희', phone: 5572");
  
  // 1. Check all attendances on 2026-02-27
  const startOfDay = new Date('2026-02-27T00:00:00.000+09:00');
  const endOfDay = new Date('2026-02-27T23:59:59.999+09:00');
  
  const attSnapshot = await db.collection('attendance')
    .where('timestamp', '>=', startOfDay)
    .where('timestamp', '<=', endOfDay)
    .get();
    
  console.log(`\nFound ${attSnapshot.size} total attendances on 2026-02-27.`);
  attSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.memberName === '박세희' || 
          (data.phoneLast4 && data.phoneLast4 === '5572') || 
          !data.memberId) {
          console.log(`Matching/Suspicious Attendance:`, doc.id, data);
      }
  });

  // 2. Also check if the timestamp is stored as a string
  const attStrSnapshot = await db.collection('attendance')
    .where('date', '==', '2026-02-27')
    .get();
    
  console.log(`\nFound ${attStrSnapshot.size} total attendances on 2026-02-27 (by date string).`);
  attStrSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.memberName === '박세희' || 
          (data.phoneLast4 && data.phoneLast4 === '5572')) {
          console.log(`Matching varchar Attendance:`, doc.id, data);
      }
  });

  // 3. Check error_logs
  const errorSnapshot = await db.collection('error_logs')
    .orderBy('timestamp', 'desc')
    .limit(50)
    .get();
    
  console.log(`\nRecent 50 error_logs:`);
  errorSnapshot.forEach(doc => {
      const data = doc.data();
      const dateVal = data.timestamp && typeof data.timestamp.toDate === 'function' 
          ? data.timestamp.toDate() 
          : (data.timestamp ? new Date(data.timestamp) : null);
      
      if (dateVal && dateVal >= startOfDay && dateVal <= endOfDay) {
          if (JSON.stringify(data).includes('박세희') || JSON.stringify(data).includes('5572')) {
              console.log(`Matching error doc:`, doc.id, data);
          }
      }
  });

  // 4. Check system_logs
  const sysSnapshot = await db.collection('system_logs')
    .where('timestamp', '>=', startOfDay)
    .where('timestamp', '<=', endOfDay)
    .get();
    
  console.log(`\nFound ${sysSnapshot.size} system_logs on 2026-02-27.`);
  sysSnapshot.forEach(doc => {
      const data = doc.data();
      if (JSON.stringify(data).includes('박세희') || JSON.stringify(data).includes('5572')) {
          console.log(`Matching sys doc:`, doc.id, data);
      }
  });

  // 5. Look for duplicates or differently spelled
  const memberSnap = await db.collection('members')
      .where('phoneLast4', '==', '5572')
      .get();
  console.log(`\nMembers showing 5572:`);
  memberSnap.forEach(doc => {
      console.log(doc.id, doc.data().name, doc.data().phone);
  });
}

investigateYesterday().catch(console.error);
