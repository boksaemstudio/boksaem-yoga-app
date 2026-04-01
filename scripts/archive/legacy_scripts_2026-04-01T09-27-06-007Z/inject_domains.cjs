const admin = require('firebase-admin');
const acc = require('../functions/service-account-key.json');
if(!admin.apps.length) admin.initializeApp({credential: admin.credential.cert(acc)});

async function injectDomains(){
    const db = admin.firestore();
    
    // Inject for boksaem-yoga
    await db.doc('platform/registry/studios/boksaem-yoga').set({
        domain: 'boksaem-yoga.web.app'
    }, { merge: true });
    
    // Inject for ssangmun-yoga
    await db.doc('platform/registry/studios/ssangmun-yoga').set({
        domain: 'ssangmun-yoga-0.web.app'
    }, { merge: true });
    
    // demo-yoga remains on passflowai.web.app
    await db.doc('platform/registry/studios/demo-yoga').set({
        domain: 'passflowai.web.app'
    }, { merge: true });

    console.log("✅ Domains injected to registry successfully.");
}
injectDomains().then(()=>process.exit(0)).catch(console.error);
