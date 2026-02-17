/**
 * Check today's attendance to see if any syncs happened
 */
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    const serviceAccount = require('../service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkAttendance() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    console.log(`--- [Attendance Logs for ${today}] ---`);
    
    const attSnap = await db.collection('attendance')
        .where('date', '==', today)
        .get();
    
    console.log(`Total Attendance Records on Server: ${attSnap.size}`);
    
    attSnap.forEach(doc => {
        const d = doc.data();
        if (d.syncMode) {
             console.log(`- Member: ${d.memberName}, Status: ${d.status}, SyncMode: ${d.syncMode}`);
        }
    });

    // Also check pending_attendance WITHOUT filter
    console.log('\n--- [All Pending Attendance on Server] ---');
    const pendingSnap = await db.collection('pending_attendance').get();
    console.log(`Total Pending on Server: ${pendingSnap.size}`);
}

checkAttendance().catch(console.error);
