
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./functions/service-account-key.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkMember() {
    console.log('=== Checking Member: 서연희 ===');
    const snap = await db.collection('members').where('name', '==', '서연희').get();
    
    if (snap.empty) {
        console.log('Member not found.');
        return;
    }

    snap.forEach(doc => {
        const d = doc.data();
        console.log(`[${doc.id}] ${d.name}`);
        console.log(` - Credits: ${d.credits}`);
        console.log(` - EndDate: ${d.endDate}`);
        console.log(` - Status: ${d.status}`);
        console.log(` - Last Attendance: ${d.lastAttendance}`);
    });
}

checkMember();
