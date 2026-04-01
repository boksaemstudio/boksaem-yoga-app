const admin = require('firebase-admin');

// Ensure we don't initialize multiple times
if (!admin.apps.length) {
    const serviceAccount = require('../functions/service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function run() {
    console.log('Searching for wqqqq, 슈퍼어드민 wqqqq, and 7788 across all common collections...');
    
    let deletedCount = 0;
    
    const collectionsToSearchTopLevel = ['users', 'admins', 'registry', 'accounts', 'members', 'staff'];

    const matchesTarget = (data) => {
        const name = String(data.name || '').toLowerCase();
        const phone = String(data.phone || '');
        const email = String(data.email || '').toLowerCase();
        const role = String(data.role || '').toLowerCase();
        
        return name.includes('wqqqq') || 
               name.includes('슈퍼어드민') || 
               phone.includes('7788') || 
               email.includes('wqqqq') ||
               phone.includes('wqqqq');
    };

    // 1. Check top-level collections
    for (const coll of collectionsToSearchTopLevel) {
        try {
            const snap = await db.collection(coll).get();
            for (const doc of snap.docs) {
                const data = doc.data();
                if (matchesTarget(data)) {
                    console.log(`Found target in top-level ${coll}: [${doc.id}] ${data.name || 'NoName'} | ${data.phone || 'NoPhone'} | ${data.email || 'NoEmail'}`);
                    await doc.ref.delete();
                    console.log(` -> Deleted doc ${doc.id}`);
                    deletedCount++;
                }
            }
        } catch (e) {
            // collection might not exist or error reading
        }
    }

    // 2. Check all studios and their subcollections
    try {
        const studiosSnapshot = await db.collection('studios').get();
        for (const studioDoc of studiosSnapshot.docs) {
            const studioId = studioDoc.id;
            
            const subcollections = ['members', 'admins', 'users', 'staff'];
            for (const sub of subcollections) {
                try {
                    const snap = await studioDoc.ref.collection(sub).get();
                    for (const doc of snap.docs) {
                        const data = doc.data();
                        if (matchesTarget(data)) {
                            console.log(`Found target in studios/${studioId}/${sub}: [${doc.id}] ${data.name || 'NoName'} | ${data.phone || 'NoPhone'}`);
                            await doc.ref.delete();
                            console.log(` -> Deleted doc ${doc.id}`);
                            deletedCount++;
                        }
                    }
                } catch (e) {
                    // Ignore errors
                }
            }
        }
    } catch (e) {
        console.error("Error reading studios:", e);
    }
    
    console.log(`Total deleted: ${deletedCount}`);
}

run().catch(console.error);
