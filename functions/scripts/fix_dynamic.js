const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'service-account-key.json'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixNewRecords() {
    console.log('=== Fixing Start ===');
    const today = '2026-02-15';
    
    // Get ALL self-practice records for today
    const snapshot = await db.collection('attendance')
        .where('date', '==', today)
        .where('className', '==', '\uC790\uC728\uC218\uB828')
        .get();

    if (snapshot.empty) {
        console.log('No self-practice records found to fix.');
        return;
    }

    const batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const branchId = data.branchId;
        const time = new Date(data.timestamp);
        const kstHour = time.toLocaleString('en-US', { timeZone: 'Asia/Seoul', hour: '2-digit', hour12: false });
        const kstMin = time.toLocaleString('en-US', { timeZone: 'Asia/Seoul', minute: '2-digit' });
        const currentMin = parseInt(kstHour) * 60 + parseInt(kstMin);

        console.log(`Checking ${data.memberName} (${branchId} ${kstHour}:${kstMin})`);

        // Hardcoded schedule for today based on known data
        let targetClass = null;
        let targetInstructor = null;

        if (branchId === 'gwangheungchang') {
            // 19:00 (1140 min)
            if (currentMin >= 1110 && currentMin <= 1185) { // 18:30 ~ 19:45
                targetClass = '\uD558\uD0C0';
                targetInstructor = '\uD61C\uC2E4';
            }
        } else if (branchId === 'mapo') {
            // 18:40 (1120 min)
            if (currentMin >= 1090 && currentMin <= 1165) { // 18:10 ~ 19:25
                targetClass = '\uD558\uD0C0';
                targetInstructor = '\uB2E4\uB098';
            }
        }

        if (targetClass) {
            batch.update(doc.ref, { 
                className: targetClass,
                instructor: targetInstructor 
            });
            console.log(`  -> FIXING to: ${targetClass} / ${targetInstructor}`);
            count++;
        } else {
            console.log('  -> No matching class found in hardcoded range.');
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`Successfully fixed ${count} records.`);
    } else {
        console.log('Nothing to fix.');
    }
    process.exit(0);
}

fixNewRecords().catch(e => { console.error(e); process.exit(1); });
