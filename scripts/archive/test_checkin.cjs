const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./functions/service-account-key.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
    const snap = await db.collection('attendance').where('memberId', '==', '5VrqX803MZUPRQ7ipM7G').orderBy('timestamp', 'desc').limit(10).get();
    console.log(`Found ${snap.size} attendance records for 박문선`);
    snap.forEach(doc => {
        const d = doc.data();
        console.log(`- ${doc.id}: date: ${d.date}, time: ${d.timestamp}, status: ${d.status}, reason: ${d.denialReason}, session: ${d.sessionNumber}`);
    });
}

run().then(() => process.exit(0));
