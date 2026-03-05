/**
 * Check Feb 15th attendance
 */
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    const serviceAccount = require('../service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkFebPlan() {
    const date = '2026-02-15';
    console.log(`--- [Attendance Logs for ${date}] ---`);
    
    const attSnap = await db.collection('attendance')
        .where('date', '==', date)
        .get();
    
    console.log(`Total Attendance Records on Server for ${date}: ${attSnap.size}`);
    
    // Check if any have status 'denied'
    let denied = 0;
    attSnap.forEach(doc => {
        if (doc.data().status === 'denied') denied++;
    });
    console.log(`Denied: ${denied}`);
}

checkFebPlan().catch(console.error);
