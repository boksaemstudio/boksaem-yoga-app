/**
 * Investigate Pending Attendance (Sync Issues)
 */
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    const serviceAccount = require('../service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function investigatePending() {
    console.log('--- [Pending Attendance Investigation] ---');
    const pendingSnap = await db.collection('pending_attendance').get();
    
    console.log(`Total Pending Records: ${pendingSnap.size}`);
    
    if (pendingSnap.empty) {
        console.log('No pending records found in Firestore. (Wait, the UI shows 20?)');
        return;
    }

    const records = [];
    pendingSnap.forEach(doc => {
        records.push({ id: doc.id, ...doc.data() });
    });

    // Group by status
    const statusGroups = {};
    records.forEach(r => {
        const s = r.status || 'pending-offline';
        statusGroups[s] = (statusGroups[s] || 0) + 1;
    });

    console.log('Status Breakdown:', JSON.stringify(statusGroups, null, 2));

    // Look at the oldest 5 records
    console.log('\n--- [Oldest 5 Records] ---');
    records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    records.slice(0, 5).forEach(r => {
        console.log(`- ID: ${r.id}, Member: ${r.memberId}, Date: ${r.date}, Time: ${r.timestamp}, Status: ${r.status}`);
    });
}

investigatePending().catch(console.error);
