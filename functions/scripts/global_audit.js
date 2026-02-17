/**
 * Global Document Count Audit
 */
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    const serviceAccount = require('../service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function globalAudit() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const collections = ['attendance', 'pending_attendance', 'error_logs', 'ai_error_logs', 'ai_usage', 'messages'];
    
    console.log(`--- [Global Audit for ${today}] ---`);
    
    for (const collName of collections) {
        let count = 0;
        try {
            if (collName === 'attendance' || collName === 'pending_attendance') {
                const snap = await db.collection(collName).get();
                count = snap.size;
            } else {
                // For logs, just count total for now
                const snap = await db.collection(collName).limit(100).get();
                count = snap.size;
            }
            console.log(`${collName}: ${count} total records on server`);
        } catch (e) {
            console.log(`${collName}: Error - ${e.message}`);
        }
    }

    // Check specific query for today's attendance
    const todayAtt = await db.collection('attendance').where('date', '==', today).get();
    console.log(`Today's Attendance: ${todayAtt.size}`);
}

globalAudit().catch(console.error);
