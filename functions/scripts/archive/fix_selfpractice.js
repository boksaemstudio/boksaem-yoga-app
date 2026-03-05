const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'service-account-key.json'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixRecords() {
    console.log('=== Fixing Self-Practice Records ===\n');

    // Corrections mapping: docId -> { className, instructor }
    const fixes = [
        // gwangheungchang members (18:35~18:51) -> 19:00 하타 / 혜실
        { id: 'wSf50CDDLyROVPh7ES6O', name: '\uAE40\uAE30\uC5F0', className: '\uD558\uD0C0', instructor: '\uD61C\uC2E4' },
        { id: 'hsxAg9DjojCwTXTinXF2', name: '\uC870\uC218\uD615', className: '\uD558\uD0C0', instructor: '\uD61C\uC2E4' },
        { id: 'yK1zF9AXdkDV2trfBdNV', name: '\uAE40\uD0DC\uC5F0', className: '\uD558\uD0C0', instructor: '\uD61C\uC2E4' },
        { id: 'gnDPHOuQh0Q6Fd7Vztor', name: '\uC591\uC9C0\uD638', className: '\uD558\uD0C0', instructor: '\uD61C\uC2E4' },
        // 정다솔 (16:30 gwangheungchang) -> 14:00 하타 인텐시브 / 원장 (closest match)
        { id: 'pFsUQ3YXI6QAmgTQIzzt', name: '\uC815\uB2E4\uC194', className: '\uD558\uD0C0 \uC778\uD150\uC2DC\uBE0C', instructor: '\uC6D0\uC7A5' },
        // mapo members (18:35~18:38) -> 18:40 하타 / 다나
        { id: 'l6S5HvM0klyspsn2W3uZ', name: '\uC720\uC131\uD654', className: '\uD558\uD0C0', instructor: '\uB2E4\uB098' },
        { id: 'UbKDP7i2E1QOOKHGPdHg', name: '\uC774\uC18C\uD604ttc7\uAE30', className: '\uD558\uD0C0', instructor: '\uB2E4\uB098' },
    ];

    const batch = db.batch();

    for (const fix of fixes) {
        const ref = db.collection('attendance').doc(fix.id);
        batch.update(ref, {
            className: fix.className,
            instructor: fix.instructor
        });
        console.log(`  [FIX] ${fix.name}: ${fix.className} / ${fix.instructor}`);
    }

    await batch.commit();
    console.log(`\n=== ${fixes.length} records fixed successfully! ===`);
    process.exit(0);
}

fixRecords().catch(e => { console.error('FAILED:', e); process.exit(1); });
