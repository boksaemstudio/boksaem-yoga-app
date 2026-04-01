const admin = require('firebase-admin');
const fs = require('fs');

if (!admin.apps.length) {
    const serviceAccount = require('../functions/service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    console.log('Fetching all auth users...');
    let allUsers = [];
    let nextPageToken;
    do {
        const userRecords = await admin.auth().listUsers(1000, nextPageToken);
        for (const user of userRecords.users) {
            allUsers.push({
                uid: user.uid,
                email: user.email,
                phone: user.phoneNumber,
                name: user.displayName,
                claims: user.customClaims
            });
        }
        nextPageToken = userRecords.pageToken;
    } while(nextPageToken);
    
    fs.writeFileSync('./auth_dump.json', JSON.stringify(allUsers, null, 2));
    console.log(`Saved ${allUsers.length} users to auth_dump.json`);
    
    // Also fetch all studio_registry
    const snaps = await db.collection('studio_registry').get();
    const registry = [];
    for(const doc of snaps.docs) {
        registry.push({ id: doc.id, ...doc.data()});
    }
    fs.writeFileSync('./registry_dump.json', JSON.stringify(registry, null, 2));
    console.log(`Saved registry to registry_dump.json`);

    // Let's completely nuke studio 'egeq'
    const id = 'egeq';
    const cols = ['members', 'sales', 'attendances', 'schedules', 'notices', 'branches', 'tickets', 'classes', 'prices', 'admins'];
    for(const c of cols) {
        const d = await db.collection('studios/' + id + '/' + c).get();
        for (const dx of d.docs) await dx.ref.delete();
    }
    await db.collection('studio_registry').doc(id).delete();
    console.log('Nuked egeq (wqqqq) completely');
}

run().catch(console.error);
