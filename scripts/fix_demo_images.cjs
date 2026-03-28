const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function fixDemo() {
    const STUDIO_ID = 'demo-yoga';
    console.log(`Fixing images for ${STUDIO_ID}...`);
    
    // 1. Update Pricing Images
    await db.collection('studios').doc(STUDIO_ID).collection('assets').doc('pricing').set({
        mainUrl: 'https://firebasestorage.googleapis.com/v0/b/passflow-0324.appspot.com/o/demo-yoga%2Fassets%2Fpricing_generic.png?alt=media',
        subUrl: 'https://firebasestorage.googleapis.com/v0/b/passflow-0324.appspot.com/o/demo-yoga%2Fassets%2Fpricing_generic_2.png?alt=media',
        updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('✅ Pricing updated');

    // 2. Update Schedule Images
    await db.collection('studios').doc(STUDIO_ID).collection('assets').doc('schedule').set({
        currentUrl: 'https://firebasestorage.googleapis.com/v0/b/passflow-0324.appspot.com/o/demo-yoga%2Fassets%2Fschedule_generic.png?alt=media',
        nextUrl: 'https://firebasestorage.googleapis.com/v0/b/passflow-0324.appspot.com/o/demo-yoga%2Fassets%2Fschedule_generic_2.png?alt=media',
        updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('✅ Schedule updated');
    
    // 3. Update Logo Image
    await db.collection('studios').doc(STUDIO_ID).collection('assets').doc('logo').set({
        url: 'https://firebasestorage.googleapis.com/v0/b/passflow-0324.appspot.com/o/demo-yoga%2Fassets%2Flogo_generic.png?alt=media',
        updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('✅ Logo updated');

    console.log('Done!');
    process.exit(0);
}

fixDemo().catch(console.error);
