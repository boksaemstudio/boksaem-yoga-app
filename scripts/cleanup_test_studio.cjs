const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function cleanupTestStudio() {
    console.log("Looking for 'Test Studio AI' in users...");
    const usersSnap = await db.collection('users').where('email', '==', 'test@passflowai.com').get();
    
    if (usersSnap.empty) {
        console.log("No test user found.");
    } else {
        for (const doc of usersSnap.docs) {
            console.log(`Deleting test user ${doc.id}`);
            await db.collection('users').doc(doc.id).delete();
        }
    }

    console.log("Looking for 'Test Studio AI' in studios...");
    const studiosSnap = await db.collection('studios').where('name', '==', 'Test Studio AI').get();
    
    if (studiosSnap.empty) {
        console.log("No test studio found.");
    } else {
        for (const doc of studiosSnap.docs) {
            console.log(`Deleting test studio ${doc.id}`);
            await db.collection('studios').doc(doc.id).delete();
        }
    }
    
    console.log("Cleanup finished.");
    process.exit(0);
}

cleanupTestStudio().catch(console.error);
