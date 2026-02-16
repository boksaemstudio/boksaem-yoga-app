const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkTodayLogs() {
  const today = new Date();
  const kstDate = today.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  console.log(`Checking logs for ${kstDate}...`);

  // error_logs
  const errorRef = db.collection('error_logs');
  const errorSnap = await errorRef
    .orderBy('timestamp', 'desc')
    .limit(50)
    .get();

  console.log('\n--- Error Logs (Top 50) ---');
  errorSnap.forEach(doc => {
      const data = doc.data();
      const ts = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : 'No Time';
      
      // Filter by today roughly
      if (ts.includes(kstDate) || ts.includes(today.getDate())) { // simple check
          console.log(`[${ts}] ${data.error || data.message} (Context: ${JSON.stringify(data.context || {})})`);
      }
  });

  // ai_error_logs
  // also check ai_logs for debug
}

checkTodayLogs();
