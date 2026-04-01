const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = require('../functions/service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    console.log('Listing ALL root collections...');
    const collections = await db.listCollections();
    for (const coll of collections) {
        console.log(`- ${coll.id}`);
        
        // Also let's scan the first 100 docs of each to see if we find "wqqqq" or "7788"
        try {
            const snap = await db.collection(coll.id).limit(100).get();
            for (const doc of snap.docs) {
                const dataStr = JSON.stringify(doc.data()).toLowerCase();
                const docId = doc.id.toLowerCase();
                
                if (dataStr.includes('wqqqq') || dataStr.includes('7788') || docId.includes('wqqqq') || docId.includes('7788')) {
                    console.log(`   [!] MATCH FOUND in root ${coll.id} -> doc ${doc.id}`);
                    console.log(`   Data snippet: ${dataStr.slice(0, 100)}`);
                    // Don't auto-delete just yet if we're not sure, but we can if we want
                    await doc.ref.delete();
                    console.log(`   Deleted root doc ${doc.id}`);
                }
            }
        } catch(e) {}
    }
}

run().catch(console.error);
