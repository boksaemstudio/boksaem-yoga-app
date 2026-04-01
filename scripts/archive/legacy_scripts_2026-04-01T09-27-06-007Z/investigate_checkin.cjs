const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function run() {
  try {
    const today = '2026-03-06';
    const snap = await db.collection('attendance').where('date', '==', today).get();
    
    let logs = [];
    snap.forEach(d => {
        logs.push({ id: d.id, ...d.data() });
    });

    logs.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    console.log(`--- All Attendances for ${today} ---`);
    logs.forEach(data => {
        const d = new Date(data.timestamp);
        const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        
        console.log(`[${timeStr}] (ID: ${data.id}) ${data.memberName || data.name} (${data.memberId}) - Method: ${data.method}, InputPhone: ${data.phoneLast4}, Class: ${data.className || 'none'}, Status: ${data.status}`);
    });

  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
