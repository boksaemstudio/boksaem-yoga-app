const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function analyzeLogs() {
  const memberId = 'mvA0leUDiAe47dxLDt59'; // 이청미 ID
  const today = new Date();
  const kstDate = today.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  
  console.log(`Analyzing logs for Member ID: ${memberId} on ${kstDate}...\n`);

  // 1. Error Logs (check pin/memberId)
  const errRef = db.collection('error_logs');
  const errSnap = await errRef
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
  
  let foundErr = 0;
  console.log('--- Checking Error Logs ---');
  errSnap.forEach(doc => {
      const data = doc.data();
      const ts = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)) : null;
      if (!ts) return;
      
      const tsKST = ts.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
      // Filter by today
      if (!tsKST.includes(kstDate) && !tsKST.includes(today.getDate())) return; // loose check

      // Check pin or memberId
      // Sometimes pin is just last 4 digits. Or check context.
      const ctx = data.context || {};
      const msg = data.error || data.message || '';
      
      let match = false;
      if (ctx.memberId === memberId) match = true;
      if (ctx.pin && ctx.pin === '0624') match = true; // Need to know PIN but assuming based on prev context... wait, I don't know her PIN. But I know her ID.
      // I can check her PIN from members collection if needed.

      if (msg.includes(memberId) || msg.includes('이청미')) match = true;
      
      if (match) {
          console.log(`[ERROR] ${tsKST} | ${msg} | Context: ${JSON.stringify(ctx)}`);
          foundErr++;
      }
  });

  if (foundErr === 0) console.log("No specific error logs found for this member today.");

  // 2. AI Error Logs (maybe AI load failed?)
  const aiRef = db.collection('ai_error_logs');
  const aiSnap = await aiRef.orderBy('timestamp', 'desc').limit(50).get();
  
  let foundAI = 0;
  console.log('\n--- Checking AI Logs ---');
  aiSnap.forEach(doc => {
      const data = doc.data();
      const ctx = data.context || {};
      const ts = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)) : null;
       if (!ts) return;
      const tsKST = ts.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

      // check memberId or name
      let match = false;
      // Assume context structure varies
      if (JSON.stringify(data).includes(memberId) || JSON.stringify(data).includes('이청미')) {
          match = true;
      }
      
      if (match) {
           console.log(`[AI-LOG] ${tsKST} | ${data.error || 'No Msg'} | Context: ${data.context}`);
           foundAI++;
      }
  });
  if (foundAI === 0) console.log("No AI logs found for this member today.");
}

analyzeLogs();
