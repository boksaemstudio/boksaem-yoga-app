const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

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

async function checkSyncMode() {
    const memberId = 'mvA0leUDiAe47dxLDt59';
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    
    const snap = await db.collection('attendance')
        .where('memberId', '==', memberId)
        .where('date', '==', today)
        .get();
    
    snap.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id} | syncMode: ${data.syncMode || 'N/A'} | timestamp: ${data.timestamp}`);
    });
}

checkSyncMode().catch(console.error);
