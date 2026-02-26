const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./functions/service-account-key.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
    const phone = '010-5047-6711';
    const mSnap = await db.collection('members').where('phone', '==', phone).get();
    if(mSnap.empty) {
        console.log('Member not found');
        return;
    }
    const member = mSnap.docs[0];
    console.log('--- Member ---');
    console.log(member.id, member.data());
    
    const msSnap = await db.collection('memberships').where('memberId', '==', member.id).get();
    console.log('\n--- Memberships ---');
    msSnap.forEach(d => {
        const data = d.data();
        console.log(d.id, data.status, 'start:', data.startDate, 'end:', data.endDate, 'rem:', data.remainingCount);
    });

    const errorSnap = await db.collection('error_logs').orderBy('timestamp', 'desc').limit(10).get();
    console.log('\n--- Recent Errors ---');
    errorSnap.forEach(d => {
        const data = d.data();
        console.log(data.timestamp, data.message || data.error);
    });
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
