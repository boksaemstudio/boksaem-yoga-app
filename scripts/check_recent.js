import admin from 'firebase-admin';

async function main() {
  try { admin.initializeApp(); } catch (e) {}
  const db = admin.firestore();
  
  try {
      const attRef = db.collection('attendance');
      const attSnapshot = await attRef.orderBy('timestamp', 'desc').limit(15).get();
      
      console.log("=== Recent Attendance Logs ===");
      attSnapshot.forEach(doc => {
          const data = doc.data();
          const time = new Date(data.timestamp).toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'});
          console.log(`[${time}] Name: ${data.memberName || data.name} | Status: ${data.status} | Photo: ${data.photoUrl ? 'YES' : 'NO'}`);
      });
  } catch (error) {
      console.error(error);
  } finally {
      process.exit(0);
  }
}
main();
