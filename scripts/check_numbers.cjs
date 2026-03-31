const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = require('../functions/service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkNumbers(collectionPath) {
    const sn = await db.collection(collectionPath).get();
    let found = [];
    for (const doc of sn.docs) {
        const data = doc.data();
        const id = doc.id;
        const name = data.name || '';
        const nameEnglish = data.nameEnglish || '';
        
        // Regex to check if there are any digits
        const hasNumber = /\d/.test(id) || /\d/.test(name) || /\d/.test(nameEnglish);
        
        if (hasNumber) {
            found.push({ collectionPath, id, name, nameEnglish });
        }
    }
    return found;
}

async function run() {
    console.log('Scanning for items with numbers...');
    
    const registries = await checkNumbers('platform/registry/studios');
    console.log('Studios:', registries);
    
    const pendings = await checkNumbers('platform/registry/pending_studios');
    console.log('Pending Studios:', pendings);
    
    // Check if there are admins with numbers in their displayName?
    const admins = await checkNumbers('system_admins');
    console.log('System Admins:', admins);
    
    console.log('Scan complete.');
}

run().catch(console.error);
