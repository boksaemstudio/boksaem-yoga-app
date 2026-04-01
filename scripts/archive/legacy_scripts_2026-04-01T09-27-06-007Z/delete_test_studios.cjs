const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'passflowai',
    });
}

const db = admin.firestore();

async function deleteTenant(studioId) {
    if (!studioId) return;

    console.log(`\n🔴 Deleting ALL data for studio: ${studioId}`);

    // 1. Delete from registry
    await db.collection('platform').doc('registry').collection('studios').doc(studioId).delete();
    console.log(`✔ Removed from registry (platform/registry/studios/${studioId})`);

    // 2. Delete all subcollections under studios/{studioId}
    const tenantRef = db.collection('studios').doc(studioId);
    const collections = ['members', 'attendance', 'classes', 'booking', 'settings', 'notices', 'messages'];
    
    for (const col of collections) {
        const snapshot = await tenantRef.collection(col).get();
        if (snapshot.empty) continue;
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`✔ Deleted ${snapshot.size} documents from ${col}`);
    }

    // 3. Delete the main config doc
    await tenantRef.delete();
    console.log(`✔ Deleted main studio document (studios/${studioId})`);
    console.log('Done.');
}

async function main() {
    await deleteTenant('egeq');
    await deleteTenant('yyyuuuu');
    console.log('All requested test studios deleted successfully.');
}

main().catch(console.error);
