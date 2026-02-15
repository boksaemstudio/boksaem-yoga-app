const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('./functions/service-account-key.json');

if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function checkDailyClasses() {
    console.log('--- Checking daily_classes for Mapo 2026-02-15 ---');
    const docId = 'mapo_2026-02-15';
    const doc = await db.collection('daily_classes').doc(docId).get();
    
    if (doc.exists) {
        const data = doc.data();
        console.log('Classes found:');
        data.classes.forEach(c => {
            console.log(` - ${JSON.stringify(c)}`);
        });
    } else {
        console.log('Document not found for ' + docId);
    }
}

checkDailyClasses().catch(console.error);
