const admin = require('firebase-admin');
const path = require('path');
const serviceAccountPath = path.join(__dirname, 'boksaem-yoga-firebase-adminsdk.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    const docB = await db.collection('studios').doc('boksaem-yoga').get();
    console.log("=== BOKSAEM YOGA ===");
    console.log(JSON.stringify(docB.data().IDENTITY));
    
    const docD = await db.collection('studios').doc('demo-yoga').get();
    console.log("=== DEMO YOGA ===");
    console.log(JSON.stringify(docD.data().IDENTITY));
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
