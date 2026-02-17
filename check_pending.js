
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./functions/service-account-key.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkPending() {
    console.log('=== Checking Pending Attendance ===');
    const snap = await db.collection('pending_attendance').get();
    console.log(`Found ${snap.size} pending records.`);
    snap.forEach(doc => {
        console.log(`[${doc.id}]`, doc.data());
    });
}

checkPending();
