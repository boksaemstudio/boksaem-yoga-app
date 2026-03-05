
const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

try {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
    if (!admin.apps.length) admin.initializeApp();
}

const db = admin.firestore();

async function inspectCollections() {
    console.log("=== INSPECTING COLLECTIONS ===\n");

    const collections = ['attendance', 'ai_error_logs', 'error_logs', 'fcm_tokens'];

    for (const colName of collections) {
        const snap = await db.collection(colName).limit(1).get();
        if (!snap.empty) {
            console.log(`\n--- ${colName} sample ---`);
            console.log(JSON.stringify(snap.docs[0].data(), null, 2));
        } else {
            console.log(`\n--- ${colName} is empty ---`);
        }
    }
}

inspectCollections();
