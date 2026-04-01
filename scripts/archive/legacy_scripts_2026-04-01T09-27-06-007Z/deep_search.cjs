const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = require('../functions/service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    console.log('Deep query via collectionGroup...');
    let totalDeleted = 0;

    const queryGroups = ['admins', 'users', 'members', 'staff', 'superadmins', 'accounts', 'instructors'];
    
    for (const group of queryGroups) {
        try {
            const snapshot = await db.collectionGroup(group).get();
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const jsonStr = JSON.stringify(data).toLowerCase();
                
                if (jsonStr.includes('wqqqq') || jsonStr.includes('7788') || jsonStr.includes('슈퍼어드민')) {
                    console.log(`[!] MATCH FOUND in ${group} : docPath: ${doc.ref.path}`);
                    console.log('Data:', JSON.stringify(data));
                    
                    // Let's delete it
                    await doc.ref.delete();
                    console.log(` -> Deleted ${doc.ref.path}`);
                    
                    // If this doc is an auth user id, maybe delete from auth too
                    try {
                        await admin.auth().deleteUser(doc.id);
                        console.log(` -> Deleted Auth user: ${doc.id}`);
                    } catch(e) {}
                    
                    totalDeleted++;
                }
            }
        } catch (e) {
            console.error(`Error with collectionGroup ${group}:`, e.message);
        }
    }

    console.log(`Deep query finished. Total deleted: ${totalDeleted}`);
}

run().catch(console.error);
