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

async function analyze() {
    console.log('--- Analyzing Attendance (After 1 PM) ---');
    const today = '2026-02-15';
    // 13:00 KST = 04:00 UTC
    const startTime = '2026-02-15T04:00:00Z'; 

    const snapshot = await db.collection('attendance')
        .where('date', '==', today)
        .get();
        
    // Filter by time in memory (since 13:00 KST = 04:00 UTC)
    // and sort
    const records = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.timestamp >= startTime)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    console.log(`Found ${records.length} records after 13:00.`);
    
    if (records.length === 0) return;

    // Fetch Schedules
    const branches = ['gwangheungchang', 'mapo'];
    const schedules = {};
    for (const b of branches) {
        const doc = await db.collection('daily_classes').doc(`${b}_${today}`).get();
        schedules[b] = doc.exists ? doc.data().classes : [];
    }

    // Analysis
    records.forEach(rec => {
        const kstDate = new Date(rec.timestamp);
        // Manual KST conversion for display
        kstDate.setHours(kstDate.getHours() + 9);
        const timeStr = kstDate.toISOString().replace('T', ' ').substring(11, 19);
        
        console.log(`[${timeStr}] ${rec.memberName} (${rec.branchId}) - ${rec.className} (Status: ${rec.status}, Credits: ${rec.credits})`);
        
        // Validation: Check against schedule
        const branchSchedule = schedules[rec.branchId] || [];
        // Approximate time check (simple)
        // Check if 'Self Practice' was used during a scheduled class time
        if (rec.className === '자율수련' || rec.className === 'Self Practice') {
             // Logic: If check-in time is within [Class Start - 30m, Class End], it should probably be that class
             const checkInMinutes = kstDate.getHours() * 60 + kstDate.getMinutes();
             
             const match = branchSchedule.find(c => {
                 const [h, m] = c.time.split(':').map(Number);
                 const startMins = h * 60 + m;
                 const duration = c.duration || 60;
                 return checkInMinutes >= (startMins - 30) && checkInMinutes < (startMins + duration);
             });
             
             if (match) {
                 console.log(`   -> ⚠️ WARNING: Marked as 'Self Practice' but scheduled class '${match.className}' (${match.time}) exists.`);
             }
        }
        
        // Validation: Duplicate check (Member checked in multiple times?)
        const dups = records.filter(r => r.memberId === rec.memberId);
        if (dups.length > 1) {
            console.log(`   -> ⚠️ DUPLICATE SUSPECT: Member has ${dups.length} records in this period.`);
        }
    });
}

analyze().catch(console.error);
