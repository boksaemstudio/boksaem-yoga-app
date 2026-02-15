const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize with service account
const serviceAccountPath = path.join(__dirname, 'functions/service-account-key.json');
if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    if (admin.apps.length === 0) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
} else {
    if (admin.apps.length === 0) admin.initializeApp();
}

const db = admin.firestore();

async function checkSchema() {
    console.log('--- Checking Schema of daily_classes ---');
    const today = '2026-02-15';
    const docRef = db.collection('daily_classes').doc(`gwangheungchang_${today}`);
    const snap = await docRef.get();
    
    if (!snap.exists) {
        console.log('Document does not exist.');
        return;
    }

    const data = snap.data();
    console.log('Classes array found:', !!data.classes);
    if (data.classes && data.classes.length > 0) {
        console.log('First class object keys:', Object.keys(data.classes[0]));
        console.log('First class object:', data.classes[0]);
        
        // Check 14:00 class specifically
        const intensive = data.classes.find(c => c.time === '14:00');
        if (intensive) {
            console.log('\n[14:00 Class Keys]:', Object.keys(intensive));
            console.log('Values:', intensive);
        }
    }
}

checkSchema().catch(console.error);
