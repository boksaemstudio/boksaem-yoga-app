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

async function checkFebSchedule() {
    console.log('--- Checking Schedule Existence for Feb 2026 ---');
    const year = 2026;
    const month = 2;
    const branches = ['gwangheungchang', 'mapo'];
    
    // Get days in Feb 2026
    const daysInMonth = new Date(year, month, 0).getDate();
    console.log(`Checking ${daysInMonth} days in Feb 2026...`);

    for (const branchId of branches) {
        console.log(`\n[Branch: ${branchId}]`);
        let missingCount = 0;
        let emptyCount = 0;
        let validCount = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const docId = `${branchId}_${dateStr}`;
            const docRef = db.collection('daily_classes').doc(docId);
            const snap = await docRef.get();

            if (!snap.exists) {
                console.log(` ❌ Missing: ${dateStr}`);
                missingCount++;
            } else {
                const data = snap.data();
                if (!data.classes || data.classes.length === 0) {
                    console.log(` ⚠️ Empty: ${dateStr}`);
                    emptyCount++;
                } else {
                    validCount++;
                    // Optional: validate title property for sample
                    if (d === 15) { // Check today again just to be sure
                         console.log(` ✅ Valid: ${dateStr} (${data.classes.length} classes) [Sample: ${data.classes[0].title}]`);
                    }
                }
            }
        }
        console.log(`Result: ${validCount} Valid, ${emptyCount} Empty, ${missingCount} Missing.`);
        
        // Also check "monthly_schedules" metadata
        const metaId = `${branchId}_${year}_${month}`;
        const metaSnap = await db.collection('monthly_schedules').doc(metaId).get();
        if (metaSnap.exists) {
            console.log(` Metadata (monthly_schedules) exists: Saved at ${metaSnap.data().createdAt}`);
        } else {
             console.log(` ❌ Metadata (monthly_schedules) MISSING! Schedule might not have been created/saved properly.`);
        }
    }
}

checkFebSchedule().catch(console.error);
