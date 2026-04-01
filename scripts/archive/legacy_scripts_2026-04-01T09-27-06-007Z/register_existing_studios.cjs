const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    console.log("Reading existing studios...");
    const studiosSnap = await db.collection('studios').get();
    
    const batch = db.batch();
    let count = 0;
    
    for (const doc of studiosSnap.docs) {
        const id = doc.id;
        const registryRef = db.collection('platform').doc('registry').collection('studios').doc(id);
        const regSnap = await registryRef.get();
        
        if (!regSnap.exists) {
            console.log(`Missing registry for ${id}. Creating it...`);
            const data = doc.data();
            const identityName = data.IDENTITY?.NAME || id;
            
            // Generate basic registry data
            batch.set(registryRef, {
                name: identityName,
                nameEnglish: data.IDENTITY?.NAME_ENGLISH || id,
                domain: '',
                ownerEmail: data.adminEmail || 'admin@passflow.ai',
                status: 'active',
                plan: id === 'demo-studio' ? 'trial' : 'pro',
                createdAt: new Date().toISOString(),
                memberCount: 0
            });
            count++;
        }
    }
    
    if (count > 0) {
        await batch.commit();
        console.log(`Successfully registered ${count} orphan studios into the platform registry.`);
    } else {
        console.log("All studios are already registered in the platform registry.");
    }
    
    process.exit(0);
}
run();
