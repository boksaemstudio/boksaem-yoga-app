const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require('./functions/service-account-key.json');

if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function checkAttendance() {
    console.log('--- Checking Attendance Logs for 2026-02-15 ---');
    const todayStr = '2026-02-15';
    
    const snapshot = await db.collection('attendance').get();
    let count = 0;
    
    snapshot.forEach(doc => {
        const d = doc.data();
        // Loose match for today
        const logDate = d.timestamp ? new Date(d.timestamp).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) : d.date;
        
        if (logDate === todayStr) {
            console.log(`[${d.timestamp || d.date}] Member: ${d.memberName} | Class: ${d.className} | Instructor: ${d.instructor} | Branch: ${d.branchId} | Status: ${d.status}`);
            count++;
        }
    });
    
    console.log(`Total logs for today: ${count}`);
}

checkAttendance().catch(console.error);
