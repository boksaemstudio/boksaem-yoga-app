const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = require('../functions/service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    const studio = await db.collection('studios').doc('boksaem-yoga').get();
    console.log('--- boksaem-yoga STUDIO DATA ---');
    console.log('IDENTITY.LOGO_URL: ', studio.data().IDENTITY?.LOGO_URL);
    console.log('ASSETS.LOGO.WIDE: ', studio.data().ASSETS?.LOGO?.WIDE);
}

run().catch(console.error);
