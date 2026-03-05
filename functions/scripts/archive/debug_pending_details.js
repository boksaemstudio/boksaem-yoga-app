const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'service-account-key.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkPendingDetails() {
    console.log('=== Pending Attendance Detailed Status ===');
    const pendingSnap = await db.collection('pending_attendance').get();

    if (pendingSnap.empty) {
        console.log('No pending documents found.');
        return;
    }

    pendingSnap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`\nDoc ID: ${doc.id}`);
        console.log(` - memberId: [${data.memberId}] (${typeof data.memberId})`);
        console.log(` - date: ${data.date}`);
        console.log(` - timestamp: ${data.timestamp}`);
        console.log(` - classTitle: ${data.classTitle}`);
        console.log(` - instructor: ${data.instructor}`);
        console.log(` - branchId: ${data.branchId}`);
        console.log(` - status: ${data.status}`);
        
        if (!data.memberId) {
            console.log(' ❌ Critical: memberId is missing/undefined!');
        } else {
            console.log(' ✅ memberId present');
        }
    });
}

checkPendingDetails();
