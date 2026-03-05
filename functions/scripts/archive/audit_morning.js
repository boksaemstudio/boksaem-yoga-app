const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'service-account-key.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function auditMorningAttendance() {
    console.log('=== Audit: Attendance after 09:00 AM KST (2026-02-16) ===');
    
    // 9:00 AM KST = 00:00 UTC
    const startTime = '2026-02-16T00:00:00.000Z'; 
    console.log(`Checking records after: ${startTime}`);

    // 1. Check 'attendance' collection
    console.log('\n[1] Official Attendance Records (attendance):');
    const attSnap = await db.collection('attendance')
        .where('timestamp', '>=', startTime)
        .orderBy('timestamp', 'asc')
        .get();

    if (attSnap.empty) {
        console.log(' -> No attendance records found.');
    } else {
        console.log(` -> Found ${attSnap.size} records.`);
        attSnap.docs.forEach(doc => {
            const data = doc.data();
            console.log(` [${data.memberName}] ${data.className} / ${data.instructor} / ${data.status} / ${data.syncMode || 'auto'} / (${data.timestamp})`);
        });
    }

    // 2. Check 'pending_attendance' collection
    console.log('\n[2] Pending/Stuck Records (pending_attendance):');
    const pendingSnap = await db.collection('pending_attendance')
        .where('timestamp', '>=', startTime)
        .get();
    
    if (pendingSnap.empty) {
        console.log(' -> No pending records found (Clean).');
    } else {
        console.log(` -> Found ${pendingSnap.size} pending records! (Potential Issues)`);
        pendingSnap.docs.forEach(doc => {
            const data = doc.data();
            console.log(` ⚠️ [${data.memberId}] ${data.classTitle} / ${data.instructor} / (${data.timestamp})`);
        });
    }
}

auditMorningAttendance();
