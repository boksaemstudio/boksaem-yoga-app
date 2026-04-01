const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    console.log("Checking registry for missing createdAt fields...");
    const registryRef = db.collection('platform').doc('registry').collection('studios');
    const snapshot = await registryRef.get();
    
    const batch = db.batch();
    let count = 0;
    
    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.createdAt) {
            console.log(`Patching missing createdAt for: ${doc.id}`);
            batch.update(doc.ref, { createdAt: new Date().toISOString() });
            count++;
        }
    }
    
    if (count > 0) {
        await batch.commit();
        console.log(`Successfully patched ${count} studios with missing createdAt.`);
    } else {
        console.log("All studios already have a createdAt timestamp.");
    }
    
    // Also check for ssangmun-yoga or others that might not be in the registry at all
    const allStudiosSnap = await db.collection('studios').get();
    for (const doc of allStudiosSnap.docs) {
        const id = doc.id;
        const regSnap = await registryRef.doc(id).get();
        if (!regSnap.exists) {
            console.log(`Still missing completely from registry: ${id}. Creating...`);
            const data = doc.data();
            batch.set(registryRef.doc(id), {
                name: data.IDENTITY?.NAME || id,
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
        console.log(`Successfully recreated missing orphan studios.`);
    }
    
    console.log("FINAL REGISTRY SNAPSHOT:");
    const finalSnap = await registryRef.get();
    finalSnap.docs.forEach(d => console.log(`- ${d.id}: ${d.data().name} (createdAt=${!!d.data().createdAt})`));

    process.exit(0);
}
run();
