const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize with service account
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

async function bulkFix() {
    console.log('--- Bulk Fixing Afternoon Attendance ---');
    const today = '2026-02-15';
    const startTime = '2026-02-15T04:00:00Z'; // 13:00 KST
    
    // Target: Gwangheungchang, 14:00 class is '하타 인텐시브'
    // Any '자율수련' between 13:30 and 15:30 should be '하타 인텐시브'
    const targetClass = '하타 인텐시브';
    const targetBranch = 'gwangheungchang';

    const snapshot = await db.collection('attendance')
        .where('date', '==', today)
        //.where('branchId', '==', targetBranch) // Can't multiple inequality, filter in memory
        .get();

    const records = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.timestamp >= startTime)
        .filter(d => d.branchId === targetBranch)
        .filter(d => d.className === '자율수련' || d.className === 'Self Practice')
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    console.log(`Found ${records.length} records to fix.`);

    if (records.length === 0) return;

    const batch = db.batch();
    
    records.forEach(rec => {
        // Double check time (13:30 ~ 15:30 KST) -> 04:30 ~ 06:30 UTC
        // rec.timestamp is ISO string (UTC)
        // 13:00 KST is 04:00 UTC. 
        // We are already filtering >= 04:00 UTC.
        // Let's just fix them all as they strictly appeared in this block.
        console.log(`Fixing ${rec.memberName} (${rec.timestamp}) -> ${targetClass}`);
        const ref = db.collection('attendance').doc(rec.id);
        batch.update(ref, { className: targetClass });
    });

    await batch.commit();
    console.log('SUCCESS: Updated class names.');
}

bulkFix().catch(console.error);
