const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function deleteCollection(path) {
    const snaps = await db.collection(path).get();
    let count = 0;
    for (const doc of snaps.docs) {
        await doc.ref.delete();
        count++;
    }
    console.log(`Deleted ${count} docs from ${path}`);
}

async function nuke(id) {
    const cols = ['members', 'sales', 'attendances', 'schedules', 'notices', 'branches', 'tickets', 'classes', 'prices'];
    for(const c of cols) {
        await deleteCollection('studios/' + id + '/' + c);
    }
    await db.collection('studios').doc(id).delete();
    await db.collection('studio_registry').doc(id).delete();
    
    // Also clear from platform/onboarding
    const onboard = await db.collection('platform').doc('onboarding').collection('submissions').where('studioId', '==', id).get();
    for (const d of onboard.docs) await d.ref.delete();
    console.log(`Nuked studio: ${id}`);
}

(async () => {
    try {
        await nuke('wqqqqq');
        await nuke('7766');
        console.log('All nuked successfully.');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();
