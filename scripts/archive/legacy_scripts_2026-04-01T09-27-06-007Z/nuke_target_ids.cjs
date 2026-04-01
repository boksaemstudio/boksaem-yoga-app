const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = require('../functions/service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    console.log('Searching for doc ID or studio ID wqqqq / 7788 ...');
    const targets = ['wqqqq', '7788'];
    
    // 1. Check if they are Studio IDs
    for (const t of targets) {
        const studioRef = db.collection('studios').doc(t);
        const doc = await studioRef.get();
        if (doc.exists) {
            console.log(`[!] Found Studio with ID: ${t}`);
            // Let's delete it
            await studioRef.delete();
            console.log(` -> Deleted studio doc ${t}`);
            // Also delete known subcollections just in case
            const cols = ['members', 'sales', 'attendances', 'schedules', 'notices', 'branches', 'tickets', 'classes', 'prices', 'admins', 'users', 'staff'];
            for(const c of cols) {
                const snaps = await studioRef.collection(c).get();
                for (const subdoc of snaps.docs) {
                    await subdoc.ref.delete();
                }
            }
        }
    }

    // 2. Check registry
    for (const t of targets) {
        const registryRef = db.collection('studio_registry').doc(t);
        const doc = await registryRef.get();
        if (doc.exists) {
            console.log(`[!] Found registry for: ${t}`);
            await registryRef.delete();
        }
    }

    // 3. Check system_admins / superadmins by doc.id
    const adminCols = ['system_admins', 'superadmins', 'admins', 'users'];
    for (const col of adminCols) {
        for (const t of targets) {
            const ref = db.collection(col).doc(t);
            const doc = await ref.get();
            if (doc.exists) {
                console.log(`[!] Found in ${col} with ID: ${t}`);
                await ref.delete();
            }
        }
    }
    
    // 4. Try auth again if uid is exactly 'wqqqq' or '7788'
    for (const t of targets) {
        try {
            await admin.auth().getUser(t);
            console.log(`[!] Found Auth User with UID: ${t}`);
            await admin.auth().deleteUser(t);
            console.log(` -> Deleted Auth user: ${t}`);
        } catch(e) { /* user not found */ }
    }
    
    // 5. Query if any doc has name wqqqq exact match or phone exact match. Maybe there were capital letters?
    // Let's broaden the auth search to exactly check the values
    let nextPageToken;
    do {
        const userRecords = await admin.auth().listUsers(1000, nextPageToken);
        for (const user of userRecords.users) {
            const name = user.displayName || '';
            const email = user.email || '';
            if (name === 'wqqqq' || name === '7788' || email.includes('wqqqq') || email.includes('7788')) {
                console.log(`[!] Match in Auth: ${user.uid} (${name} / ${email})`);
                await admin.auth().deleteUser(user.uid);
                console.log(` -> Deleted`);
            }
        }
        nextPageToken = userRecords.pageToken;
    } while (nextPageToken);

    console.log('Finished doc ID check.');
}

run().catch(console.error);
