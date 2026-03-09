const admin = require('firebase-admin');
const fs = require('fs');

if (admin.apps.length === 0) {
    const serviceAccount = JSON.parse(fs.readFileSync('./service-account-key.json'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    try {
        const today = '2026-03-06';
        console.log(`Fetching attendance logs for ${today}...`);
        
        // Query attendance for today
        const snap = await db.collection('attendance')
            .where('date', '==', today)
            .get();
        
        console.log(`Total attendance records for today: ${snap.size}`);
        
        const records = [];
        snap.forEach(doc => {
            const d = doc.data();
            records.push({
                id: doc.id,
                memberId: d.memberId,
                memberName: d.memberName,
                date: d.date,
                timestamp: d.timestamp,
                checkInTime: d.checkInTime,
                className: d.className,
                branchId: d.branchId,
                phone: d.phone,
                phoneLast4: d.phoneLast4,
                method: d.method
            });
        });

        // Sort by timestamp
        records.sort((a, b) => {
            const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return tA - tB;
        });

        // Show all records, highlight ones around 13:55
        records.forEach(r => {
            const ts = r.timestamp ? new Date(r.timestamp) : null;
            const timeStr = ts ? ts.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' }) : r.checkInTime || 'unknown';
            const marker = (r.memberName === '박문선' || r.memberName === '장민정') ? ' <<<< TARGET' : '';
            console.log(`[${timeStr}] ${r.memberName} (ID: ${r.memberId}) - ${r.className || 'N/A'} | branch: ${r.branchId || 'N/A'} | method: ${r.method || 'N/A'}${marker}`);
        });

        // Also check specifically for 박문선 and 장민정
        console.log('\n--- Detailed records for 박문선 and 장민정 ---');
        const targetRecords = records.filter(r => r.memberName === '박문선' || r.memberName === '장민정');
        targetRecords.forEach(r => {
            console.log(JSON.stringify(r, null, 2));
        });

    } catch(e) {
        console.error("Error:", e);
    }
    process.exit(0);
}
run();
