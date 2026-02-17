
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./functions/service-account-key.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkLastAttendance() {
    const memberId = 'OoedtcTZwrtyxmhXlOHT'; // Seo Yeon-hee
    console.log(`=== Checking Last Attendance for Member: ${memberId} ===`);

    const snap = await db.collection('attendance')
        .where('memberId', '==', memberId)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();
    
    if (snap.empty) {
        console.log('No attendance records found.');
        return;
    }

    snap.forEach(doc => {
        const d = doc.data();
        console.log(`[${doc.id}] Date: ${d.date}`);
        console.log(` - Status: ${d.status}`);
        console.log(` - DenialReason: ${d.denialReason}`);
        console.log(` - SyncMode: ${d.syncMode}`);
        console.log(` - Timestamp: ${d.timestamp}`);
    });
}

checkLastAttendance();
