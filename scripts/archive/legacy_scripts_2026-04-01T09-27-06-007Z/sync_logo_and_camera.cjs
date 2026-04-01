const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = require('../functions/service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    console.log('--- Fixing Logo and Camera Policies ---');
    
    // 1. Sync TRUE logo (IDENTITY.LOGO_URL) to Registry for all studios
    const sn = await db.collection('platform/registry/studios').get();
    for (const doc of sn.docs) {
        const studioDoc = await db.collection('studios').doc(doc.id).get();
        if (studioDoc.exists) {
            const trueLogo = studioDoc.data().IDENTITY?.LOGO_URL;
            if (trueLogo && trueLogo !== doc.data().logoUrl) {
                console.log(`Syncing true logo for ${doc.id}: ${trueLogo}`);
                await doc.ref.update({ logoUrl: trueLogo });
            }
        }
    }

    // 2. Force Enable Camera & Face Recognition to resolve Gwangheungchang Kiosk issue
    const boksaemRef = db.collection('studios').doc('boksaem-yoga');
    await boksaemRef.set({
        POLICIES: {
            SHOW_CAMERA_PREVIEW: true,
            FACE_RECOGNITION_ENABLED: true,
            CAMERA_SIZE: 'large'
        }
    }, { merge: true });
    
    console.log('✅ Boksaem-Yoga Camera Policies Enabled!');
}

run().catch(console.error);
