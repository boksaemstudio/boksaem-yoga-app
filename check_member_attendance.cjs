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

async function checkMemberAttendance() {
    const memberId = 'mvA0leUDiAe47dxLDt59';
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    
    console.log(`\n--- Attendance details for Member: 이청미 (${memberId}) ---`);
    const snap = await db.collection('attendance')
        .where('memberId', '==', memberId)
        .where('date', '==', today)
        .get();
    
    snap.forEach(doc => {
        const data = doc.data();
        console.log(`- ID: ${doc.id}`);
        console.log(`  Time: ${data.timestamp}`);
        console.log(`  Class: ${data.className}`);
        console.log(`  Branch: ${data.branchId}`);
        console.log(`  Credits after: ${data.credits}`);
        console.log(`  Instructor: ${data.instructor}`);
        console.log('---');
    });
}

checkMemberAttendance().catch(console.error);
