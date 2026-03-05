const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkAllLogs() {
  console.log('--- Checking Audit Logs ---');
  const auditSnap = await db.collection('audit_logs').orderBy('timestamp', 'desc').limit(5).get();
  if (auditSnap.empty) {
    console.log('No audit logs found.');
  } else {
    auditSnap.forEach(doc => {
      console.log(`[${doc.id}]`, JSON.stringify(doc.data(), null, 2));
    });
  }
  console.log('\n');

  console.log('--- Checking Meditation AI Logs (Errors only) ---');
  console.log('--- Checking Meditation AI Logs (Latest 20) ---');
  try {
      const meditationSnap = await db.collection('meditation_ai_logs').orderBy('createdAt', 'desc').limit(20).get();
      
      if (meditationSnap.empty) {
        console.log('No meditation logs found.');
      } else {
        let errorCount = 0;
        meditationSnap.forEach(doc => {
            const data = doc.data();
            if (data.success === false || data.error) {
                console.log(`[ERROR] [${doc.id}]`, JSON.stringify(data, null, 2));
                errorCount++;
            }
        });
        
        if (errorCount === 0) {
            console.log('No explicit failure logs found in the last 20 entries.');
            console.log('Showing latest 2 entries for reference:');
            let count = 0;
            meditationSnap.forEach(doc => {
                if (count < 2) {
                    console.log(`[INFO] [${doc.id}]`, JSON.stringify(doc.data(), null, 2));
                    count++;
                }
            });
        }
      }
  } catch (e) {
      console.error("Error fetching meditation logs:", e);
  }
  console.log('\n');

  console.log('--- Checking ai_error_logs (Deep Check) ---');
  try {
      const errorSnap = await db.collection('ai_error_logs').orderBy('timestamp', 'desc').limit(20).get();
      if (errorSnap.empty) {
          console.log('No logs found in ai_error_logs (orderBy timestamp).');
          // Try without ordering
          const unorderedSnap = await db.collection('ai_error_logs').limit(20).get();
          if (unorderedSnap.empty) {
              console.log('No logs found in ai_error_logs (unordered).');
          } else {
              console.log('Found logs in ai_error_logs (unordered):');
              unorderedSnap.forEach(doc => console.log(`[${doc.id}]`, JSON.stringify(doc.data(), null, 2)));
          }
      } else {
          console.log(`Found ${errorSnap.size} logs in ai_error_logs:`);
          errorSnap.forEach(doc => console.log(`[${doc.id}]`, JSON.stringify(doc.data(), null, 2)));
      }
  } catch (e) {
      console.error("Error checking ai_error_logs:", e);
  }
  console.log('\n');

  console.log('--- Checking System Stats ---');
  const statsSnap = await db.collection('system_stats').orderBy('updatedAt', 'desc').limit(5).get();
  if (statsSnap.empty) { // system_stats might not have updatedAt, or might be single docs
     const allStats = await db.collection('system_stats').limit(5).get();
     if(allStats.empty) console.log('No system stats found.');
     else {
         allStats.forEach(doc => {
             console.log(`[${doc.id}]`, JSON.stringify(doc.data(), null, 2));
         });
     }
  } else {
    statsSnap.forEach(doc => {
      console.log(`[${doc.id}]`, JSON.stringify(doc.data(), null, 2));
    });
  }
}

checkAllLogs().catch(console.error);
