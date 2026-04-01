const admin = require('firebase-admin');
const acc = require('../functions/service-account-key.json');
if(!admin.apps.length) admin.initializeApp({credential: admin.credential.cert(acc)});

async function checkDomains() {
    const db = admin.firestore();
    const snap = await db.collection('platform/registry/studios').get();
    
    console.log("=== STUDIO REGISTRY DOMAINS ===");
    snap.forEach(d => {
        const data = d.data();
        console.log(`${d.id} -> Domain: ${data.domain || 'None (Using passflowai ?studio=)'}`);
    });
}
checkDomains().then(()=>process.exit(0)).catch(console.error);
