const admin = require('firebase-admin');
const acc = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(acc) });

async function checkStorageAndFirestore() {
    const bucket = admin.storage().bucket();
    const db = admin.firestore();

    console.log("--- FINDING THE MISSING PRICING TABLE ---");
    
    // 1. Check Storage for ssangmun-yoga
    console.log("\n[STORAGE] ssangmun-yoga files:");
    const [ssangmunFiles] = await bucket.getFiles({ prefix: 'studios/ssangmun-yoga/' });
    ssangmunFiles.forEach(f => console.log(f.name));

    // 2. Check Storage for demo-yoga
    console.log("\n[STORAGE] demo-yoga files:");
    const [demoFiles] = await bucket.getFiles({ prefix: 'studios/demo-yoga/' });
    demoFiles.forEach(f => console.log(f.name));

    // 3. Check Firestore pricing collections
    console.log("\n[FIRESTORE] Pricing Configs:");
    const d1 = await db.doc('studios/ssangmun-yoga/settings/pricing').get();
    console.log("Ssangmun Yoga Pricing Doc exists?", d1.exists);
    if(d1.exists) console.log(JSON.stringify(d1.data(), null, 2).substring(0, 300));

    const d2 = await db.doc('studios/demo-yoga/settings/pricing').get();
    console.log("Demo Yoga Pricing Doc exists?", d2.exists);
    if(d2.exists) console.log(JSON.stringify(d2.data(), null, 2).substring(0, 300));
    
    // Check main configs for PRICING key
    const sConfig = await db.doc('studios/ssangmun-yoga').get();
    console.log("\nSsangmun Yoga Main Doc PRICING key:", sConfig.data()?.PRICING ? "EXISTS" : "NO");

    const dConfig = await db.doc('studios/demo-yoga').get();
    console.log("Demo Yoga Main Doc PRICING key:", dConfig.data()?.PRICING ? "EXISTS" : "NO");

    // Also check registry for custom domain URL
    const reg = await db.doc('platform/registry/studios/ssangmun-yoga').get();
    console.log("\n[REGISTRY] Ssangmun Yoga Registry:", reg.data());

}

checkStorageAndFirestore().then(()=>process.exit(0)).catch(e=>{console.error(e); process.exit(1);});
