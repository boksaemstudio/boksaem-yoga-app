const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(sa)
    });
}
const db = admin.firestore();

async function runTasks() {
    try {
        console.log('1. Fixing demo-yoga specific config...');
        // Set the exact branch required for the Monthly Schedule to appear
        await db.doc('studios/demo-yoga').set({
            BRANCHES: [{ id: 'main', name: '요가&필라테스 패스플로우 (본점)', color: '#D4AF37', themeColor: '#FBB117' }],
            IDENTITY: { NAME: '요가&필라테스 패스플로우 (본점)' },
            FEATURES: { MULTI_BRANCH: false }
        }, { merge: true });
        console.log('✅ demo-yoga config fixed!');

        console.log('\n2. Looking for studios to delete (나르샤요가, 송대민필테스)...');
        const registryRef = db.collection('platform').doc('registry').collection('studios');
        const snap = await registryRef.get();
        let deletedIds = [];

        snap.forEach(doc => {
            const data = doc.data();
            const name = data.name || '';
            if (name.includes('나르샤') || name.includes('송대민')) {
                deletedIds.push({ id: doc.id, name });
            }
        });

        if (deletedIds.length === 0) {
            console.log('No studios matched the target names.');
        } else {
            for (const target of deletedIds) {
                console.log(`🗑️ Deleting registry entry: ${target.name} (${target.id})`);
                await registryRef.doc(target.id).delete();
                
                // Optionally delete the top-level studio documents too
                console.log(`🗑️ Deleting studio db: ${target.id}`);
                await db.doc(`studios/${target.id}`).delete();
            }
            console.log('✅ Successfully deleted targeted studios!');
        }

    } catch (err) {
        console.error('Error occurred:', err);
    } finally {
        process.exit(0);
    }
}

runTasks();
