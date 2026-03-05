const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./functions/service-account-key.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
    const todayStr = '2026-02-26T00:00:00.000Z';
    
    console.log('--- Login Failures Today ---');
    const failSnap = await db.collection('login_failures').where('timestamp', '>=', todayStr).get();
    failSnap.forEach(d => console.log(d.data()));

    console.log('--- Error Logs Today ---');
    const errSnap = await db.collection('error_logs').where('timestamp', '>=', todayStr).get();
    errSnap.forEach(d => console.log(d.data()));
    
    console.log('--- System Logs Today ---');
    const sysSnap = await db.collection('system_logs').where('timestamp', '>=', todayStr).get();
    sysSnap.forEach(d => console.log(d.data()));
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
