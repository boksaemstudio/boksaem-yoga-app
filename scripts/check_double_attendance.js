import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

async function main() {
  try {
    const serviceAccount = JSON.parse(
      await readFile(new URL('./serviceAccountKey.json', import.meta.url))
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    console.log("No serviceAccountKey.json found or failed to parse. Initializing default admin app.");
    admin.initializeApp();
  }

  const db = admin.firestore();

  try {
      const targetNames = ['조주완', '이비비안', '유승희'];
      
      console.log(`Checking attendances for: ${targetNames.join(', ')}`);
      
      const membersRef = db.collection('members');
      const membersSnapshot = await membersRef.where('name', 'in', targetNames).get();
      
      const memberMap = {};
      membersSnapshot.forEach(doc => {
          const data = doc.data();
          memberMap[doc.id] = data;
          console.log(`Found member: ${data.name} (ID: ${doc.id}), Credits: ${data.credits}`);
      });

      const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
      const startOfDay = new Date(`${todayStr}T00:00:00+09:00`);
      const endOfDay = new Date(`${todayStr}T23:59:59+09:00`);

      console.log(`Checking logs between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`);

      const logsRef = db.collection('attendance_logs');
      const logsSnapshot = await logsRef
          .where('timestamp', '>=', startOfDay.toISOString())
          .where('timestamp', '<=', endOfDay.toISOString())
          .get();

      const logsByMember = {};
      
      logsSnapshot.forEach(doc => {
          const data = doc.data();
          if (memberMap[data.memberId]) {
              if (!logsByMember[data.memberId]) {
                  logsByMember[data.memberId] = [];
              }
              logsByMember[data.memberId].push({ id: doc.id, ...data });
          }
      });

      for (const [memberId, member] of Object.entries(memberMap)) {
          const logs = logsByMember[memberId] || [];
          console.log(`\n--- Member: ${member.name} ---`);
          console.log(`Total logs today: ${logs.length}`);
          
          logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          
          logs.forEach(log => {
              console.log(`- Log ID: ${log.id}, Time: ${log.timestamp}, Branch: ${log.branchId}`);
          });
      }

  } catch (error) {
      console.error("Error checking attendances:", error);
  } finally {
      process.exit(0);
  }
}

main();
