import admin from 'firebase-admin';

async function main() {
  try { admin.initializeApp(); } catch (e) {}
  const db = admin.firestore();
  
  try {
      // Don't filter by date string. Just get all recent logs order by timestamp descending
      const attRef = db.collection('attendance');
      const attSnapshot = await attRef.orderBy('timestamp', 'desc').limit(200).get();

      const targetNames = ['조주완', '이비비안', '유승희'];
      
      console.log("=== Recent Logs for Targeted Members ===");
      attSnapshot.forEach(doc => {
          const data = doc.data();
          if (targetNames.includes(data.memberName) || targetNames.includes(data.name)) {
              console.log(`\nName: ${data.memberName || data.name}`);
              console.log(`Time: ${new Date(data.timestamp).toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'})} (${data.timestamp})`);
              console.log(`Status: ${data.status}`);
              console.log(`Type: ${data.type}`);
              console.log(`SyncMode: ${data.syncMode || 'N/A'}`);
          }
      });
  } catch (error) {
      console.error(error);
  } finally {
      process.exit(0);
  }
}
main();
