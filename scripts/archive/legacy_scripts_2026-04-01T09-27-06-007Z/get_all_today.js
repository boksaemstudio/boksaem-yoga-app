import admin from 'firebase-admin';
import fs from 'fs';

async function main() {
  try {
    admin.initializeApp();
  } catch (e) {
    console.log("already init");
  }

  const db = admin.firestore();
  
  try {
      const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
      let output = `Checking date: ${todayStr}\n`;

      const attRef = db.collection('attendance');
      const attSnapshot = await attRef.where('date', '==', todayStr).get();

      output += `Found ${attSnapshot.size} total attendances today.\n`;
      
      const targetNames = ['조주완', '이비비안', '유승희'];
      
      attSnapshot.forEach(doc => {
          const data = doc.data();
          if (targetNames.includes(data.memberName) || targetNames.includes(data.name)) {
              output += `\nFound Record for: ${data.memberName || data.name}\n`;
              output += `ID: ${doc.id}\n`;
              output += `Timestamp: ${new Date(data.timestamp).toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'})}\n`;
              output += `Type: ${data.type}\n`;
              output += `SyncMode: ${data.syncMode || 'N/A'}\n`;
              output += `Session: ${data.sessionNumber}\n`;
              output += `Status: ${data.status}\n`;
          }
      });
      
      fs.writeFileSync('./all_logs_today.txt', output, 'utf8');
      console.log("Successfully wrote to all_logs_today.txt!");
  } catch (error) {
      console.error(error);
  } finally {
      process.exit(0);
  }
}

main();
