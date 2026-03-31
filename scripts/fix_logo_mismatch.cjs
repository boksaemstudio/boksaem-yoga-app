const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = require('../functions/service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    const reg = await db.collection('platform/registry/studios').doc('boksaem-yoga').get();
    const studio = await db.collection('studios').doc('boksaem-yoga').get();
    
    console.log('--- Registry ---');
    console.log(reg.data().logoUrl);
    
    console.log('--- Studio Config ---');
    console.log(studio.data().ASSETS?.LOGO?.WIDE);
    
    console.log('--- Ssangmun Registry ---');
    const sg = await db.collection('platform/registry/studios').doc('ssangmun-yoga').get();
    if(sg.exists) console.log(sg.data().logoUrl);
    
    console.log('--- Fixing Registry Mismatches ---');
    if (reg.data().logoUrl !== studio.data().ASSETS?.LOGO?.WIDE) {
        console.log('Mismatched logo! Fixing it in registry...');
        await reg.ref.update({ logoUrl: studio.data().ASSETS?.LOGO?.WIDE || '' });
    }
}

run().catch(console.error);
