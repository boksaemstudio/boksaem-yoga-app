const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = require('../functions/service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    console.log('--- Checking Tenants ---');
    const tenants = await db.collection('tenants').get();
    for (const doc of tenants.docs) {
        console.log(`Tenant: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
    }
    
    console.log('\n--- Checking Ssangmun Yoga in Registry ---');
    const sg = await db.collection('platform/registry/studios').doc('ssangmun-yoga').get();
    if(sg.exists) console.log(JSON.stringify(sg.data(), null, 2));
    
    console.log('\n--- Checking Ssangmun Yoga 0324? ---');
    const sg0324 = await db.collection('platform/registry/studios').doc('ssangmun-yoga-0324').get();
    if(sg0324.exists) console.log('Exists! ' + JSON.stringify(sg0324.data(), null, 2));
    
    console.log('\n--- pending_studios Cleanup Check ---');
    const pendingSn = await db.collection('platform/registry/pending_studios').get();
    for (const doc of pendingSn.docs) {
        let name = doc.data().name || '';
        if (/\d/.test(name) || name === 'wqqqqq' || name === 'ssss' || name === 'qhrtodadf') {
            console.log(`Will delete pending: ${doc.id} -> ${name}`);
            await doc.ref.delete();
        }
    }
}

run().catch(console.error);
