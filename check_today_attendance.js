
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./functions/service-account-key.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkTodayAttendance() {
    console.log('=== Checking Today\'s Attendance Data (Admin) ===\n');

    // Get Today's Range in KST
    const now = new Date();
    const utcNow = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(utcNow + kstOffset);
    
    const startOfDayKST = new Date(kstNow);
    startOfDayKST.setHours(0, 0, 0, 0);
    const endOfDayKST = new Date(kstNow);
    endOfDayKST.setHours(23, 59, 59, 999);

    const startTimestamp = startOfDayKST.getTime() - kstOffset;
    const endTimestamp = endOfDayKST.getTime() - kstOffset;

    console.log(`Querying range (UTC): ${new Date(startTimestamp).toISOString()} ~ ${new Date(endTimestamp).toISOString()}`);
    console.log(`Querying range (KST): ${startOfDayKST.toLocaleString()} ~ ${endOfDayKST.toLocaleString()}`);

    try {
        // 1. Check 'attendance' collection (Latest 10)
        console.log('\n--- 1. Checking [attendance] collection (Latest 10) ---');
        const attSnap = await db.collection('attendance')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        console.log(`✅ Found ${attSnap.size} records in 'attendance'`);
        if (!attSnap.empty) {
            attSnap.forEach(doc => {
                const data = doc.data();
                const time = new Date(data.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
                console.log(`   - [${time}] ${data.memberName} (${data.branchId}) - ${data.className} (Doc ID: ${doc.id})`);
            });
        } else {
            console.log("   (No records found)");
        }

        // 2. Check 'pending_attendance' collection (Latest 10)
        console.log('\n--- 2. Checking [pending_attendance] collection (Latest 10) ---');
        const pendingSnap = await db.collection('pending_attendance')
             .orderBy('timestamp', 'desc')
             .limit(10)
             .get();

        console.log(`⚠️ Found ${pendingSnap.size} records in 'pending_attendance'`);
        if (!pendingSnap.empty) {
            pendingSnap.forEach(doc => {
                const data = doc.data();
                const time = new Date(data.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
                console.log(`   - [${time}] ${data.memberName} (${data.branchId}) - Status: ${data.status || 'N/A'} (Doc ID: ${doc.id})`);
            });
        } else {
             console.log("   (No pending records)");
        }

    } catch (error) {
        console.error('❌ Error querying:', error);
    }
}

checkTodayAttendance().then(() => process.exit(0));
