const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    const s = await db.collection('studios').doc('boksaem-yoga').collection('attendance')
        .where('branchId', '==', 'mapo')
        .where('instructor', '==', '송미')
        .where('className', '==', '플라잉')
        .get();
        
    const batch = db.batch();
    let count = 0;
    
    s.docs.forEach(d => {
        batch.update(d.ref, { className: '플라잉 (기초)' });
        count++;
    });
    
    if (count > 0) {
        await batch.commit();
        console.log(`Successfully unified ${count} historical Mapo Flying classes to "플라잉 (기초)"`);
    } else {
        console.log('No historical records needed fixing.');
    }
    process.exit(0);
}
run();
