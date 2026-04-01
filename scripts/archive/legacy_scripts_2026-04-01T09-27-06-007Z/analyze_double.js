import admin from 'firebase-admin';
import { readFile, writeFile } from 'fs/promises';

async function main() {
  try {
    const serviceAccount = JSON.parse(
      await readFile(new URL('./serviceAccountKey.json', import.meta.url))
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    admin.initializeApp();
  }

  const db = admin.firestore();
  let outStr = "========== ATTENDANCE LOGS FOR TARGET MEMBERS ==========\n\n";

  try {
      const targetNames = ['조주완', '이비비안', '유승희'];
      
      const membersRef = db.collection('members');
      const membersSnapshot = await membersRef.where('name', 'in', targetNames).get();
      
      const memberMap = {};
      membersSnapshot.forEach(doc => { memberMap[doc.id] = doc.data(); });

      const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
      const startOfDay = new Date(`${todayStr}T00:00:00+09:00`);
      const endOfDay = new Date(`${todayStr}T23:59:59+09:00`);

      const attRef = db.collection('attendance');
      const attSnapshot = await attRef
          .where('timestamp', '>=', startOfDay.toISOString())
          .where('timestamp', '<=', endOfDay.toISOString())
          .get();

      const logsByMember = {};
      attSnapshot.forEach(doc => {
          const data = doc.data();
          if (memberMap[data.memberId]) {
              if (!logsByMember[data.memberId]) logsByMember[data.memberId] = [];
              logsByMember[data.memberId].push({ id: doc.id, ...data });
          }
      });

      for (const [memberId, member] of Object.entries(memberMap)) {
          const logs = logsByMember[memberId] || [];
          outStr += `[ Member: ${member.name} ] - Total logs today: ${logs.length}\n`;
          
          logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          
          logs.forEach((log, index) => {
              outStr += `  ${index + 1}. Time: ${new Date(log.timestamp).toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'})}\n`;
              outStr += `     - Type: ${log.type || 'N/A'}\n`;
              outStr += `     - SyncMode: ${log.syncMode || 'N/A'}\n`;
              outStr += `     - Status: ${log.status || 'N/A'}\n`;
              outStr += `     - SessionNumber: ${log.sessionNumber || 'N/A'}\n`;
              outStr += `     - ClassTitle: ${log.className || 'N/A'}\n`;
          });
          outStr += "\n";
      }
      
      outStr += "========================================================\n";
      
      await writeFile('c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/analyze_out.txt', outStr, 'utf8');
      console.log("Results written to analyze_out.txt");
      
  } catch (error) {
      console.error("Error:", error);
  } finally {
      process.exit(0);
  }
}

main();
