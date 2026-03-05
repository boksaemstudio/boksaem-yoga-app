const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('./functions/service-account-key.json');

if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function listCollections() {
    const collections = await db.listCollections();
    console.log('--- Collections ---');
    collections.forEach(c => console.log(c.id));
}

listCollections().catch(console.error);
