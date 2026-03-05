const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'service-account-key.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkCleanupStatus() {
    console.log('=== Final Cleanup Check ===');
    
    // Check pending_attendance (ALL)
    const pendingSnap = await db.collection('pending_attendance').get();
    
    if (pendingSnap.empty) {
        console.log('✅ pending_attendance collection is COMPLETELY EMPTY.');
    } else {
        console.log(`⚠️ Found ${pendingSnap.size} documents in pending_attendance!`);
        pendingSnap.docs.forEach(doc => {
            console.log(` - Doc ID: ${doc.id} / Date: ${doc.data().date}`);
        });
    }
}

checkCleanupStatus();
