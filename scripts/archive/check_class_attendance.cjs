const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('./functions/service-account-key.json');

if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function checkClassAttendance() {
    console.log('--- Checking Attendance for "하타 인텐시브" on 2026-02-15 ---');
    const todayStr = '2026-02-15';
    
    const snapshot = await db.collection('attendance')
        .where('date', '==', todayStr)
        .where('className', '==', '하타 인텐시브')
        .get();
    
    console.log(`Found ${snapshot.size} records.`);
    snapshot.forEach(doc => {
        const d = doc.data();
        console.log(`[${d.timestamp}] Member: ${d.memberName} | Instructor: ${d.instructor} | Branch: ${d.branchId}`);
    });
}

checkClassAttendance().catch(console.error);
