const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = require('../functions/service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    console.log('Deleting from correct registry path: platform/registry/studios');
    
    // IDs seen in the screenshot
    const idsToDelete = ['egeq', 'yyyuuu'];
    
    for (const id of idsToDelete) {
        try {
            const ref = db.collection('platform').doc('registry').collection('studios').doc(id);
            const docSnap = await ref.get();
            if (docSnap.exists) {
                console.log(`Found ${id} in platform/registry/studios. Deleting...`);
                await ref.delete();
                console.log(`✅ Deleted registry for ${id}`);
            } else {
                console.log(`❌ ${id} not found in platform/registry/studios`);
            }
        } catch(e) {
            console.error(e);
        }
    }

    // Also let's check platform/registry/pending_studios just in case
    for (const id of idsToDelete) {
        try {
            const ref = db.collection('platform').doc('registry').collection('pending_studios').doc(id);
            const docSnap = await ref.get();
            if (docSnap.exists) {
                await ref.delete();
                console.log(`✅ Deleted pending_studio for ${id}`);
            }
        } catch(e) {}
    }
}

run().catch(console.error);
