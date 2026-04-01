const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = require('../functions/service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function walkCollections(ref, path) {
    const collections = await ref.listCollections();
    for (const coll of collections) {
        const fullPath = path ? `${path}/${coll.id}` : coll.id;
        try {
            const snap = await coll.get();
            for (const doc of snap.docs) {
                const dataStr = JSON.stringify(doc.data()).toLowerCase();
                const docId = doc.id.toLowerCase();
                
                if (dataStr.includes('wqqqq') || dataStr.includes('7788') || docId.includes('wqqqq') || docId.includes('7788')) {
                    if (!dataStr.includes('tensor') && !dataStr.includes('descriptor')) { // Ignore face data
                        console.log(`[!] MATCH in: ${fullPath}/${doc.id}`);
                        console.log(`    Data snippet: ${dataStr.slice(0, 200)}`);
                        await doc.ref.delete();
                        console.log(`    -> DELETED.`);
                    }
                }
                
                // recurse
                await walkCollections(doc.ref, `${fullPath}/${doc.id}`);
            }
        } catch(e) {}
    }
}

async function run() {
    console.log('Walking ENTIRE Firestore...');
    await walkCollections(db, '');
    console.log('Finished deep walk.');
}

run().catch(console.error);
