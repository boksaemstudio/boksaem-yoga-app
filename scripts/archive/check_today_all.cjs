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

async function checkAllToday() {
    console.log('--- Checking All Attendance for Today (2026-02-15) ---');
    const today = '2026-02-15';

    const snapshot = await db.collection('attendance')
        .where('date', '==', today)
        .get();

    const records = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    console.log(`Total Records: ${records.length}`);
    
    if (records.length === 0) {
        console.log('No records found.');
        return;
    }

    const branches = ['gwangheungchang', 'mapo'];
    
    branches.forEach(branch => {
        console.log(`\n[${branch.toUpperCase()}]`);
        const branchRecords = records.filter(r => r.branchId === branch);
        
        if (branchRecords.length === 0) {
            console.log(' No attendance.');
        } else {
            branchRecords.forEach(rec => {
                const kstDate = new Date(rec.timestamp);
                kstDate.setHours(kstDate.getHours() + 9);
                const timeStr = kstDate.toISOString().replace('T', ' ').substring(11, 19);
                
                console.log(` - ${timeStr} | ${rec.memberName} | ${rec.className} | Credits: ${rec.credits}`);
            });
        }
    });

    // Anomaly Check
    console.log('\n--- Anomaly Check ---');
    const memberCounts = {};
    records.forEach(r => {
        memberCounts[r.memberId] = (memberCounts[r.memberId] || 0) + 1;
    });
    
    const duplicates = Object.entries(memberCounts).filter(([id, count]) => count > 1);
    if (duplicates.length > 0) {
        console.log('⚠️ POSSIBLE DUPLICATES found:', duplicates);
    } else {
        console.log('✅ No multiple check-ins found for any member.');
    }
    
    const selfPractice = records.filter(r => r.className === '자율수련' || r.className === 'Self Practice');
    if (selfPractice.length > 0) {
        console.log('ℹ️ Self Practice Records:', selfPractice.length);
        selfPractice.forEach(r => console.log(`   - ${r.memberName} (${r.branchId})`));
    }
}

checkAllToday().catch(console.error);
