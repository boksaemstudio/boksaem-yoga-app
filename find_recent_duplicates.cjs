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

async function findRecentDuplicates() {
    const days = 3;
    const now = new Date();
    
    console.log(`\n--- Finding duplicate check-ins (short interval) for last ${days} days ---`);
    
    for (let i = 0; i < days; i++) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() - i);
        const dateStr = targetDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        
        console.log(`\nDate: ${dateStr}`);
        const snap = await db.collection('attendance').where('date', '==', dateStr).get();
        const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const memberGroups = {};
        records.forEach(r => {
            if (!memberGroups[r.memberId]) memberGroups[r.memberId] = [];
            memberGroups[r.memberId].push(r);
        });
        
        let foundOnDate = false;
        Object.entries(memberGroups).forEach(([mid, list]) => {
            if (list.length > 1) {
                list.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                for (let j = 0; j < list.length - 1; j++) {
                    const t1 = new Date(list[j].timestamp);
                    const t2 = new Date(list[j+1].timestamp);
                    const diffMin = (t2 - t1) / (1000 * 60);
                    
                    if (diffMin < 10) { // 10 minutes threshold
                        console.log(`⚠️  Duplicate found for ${list[j].memberName} (${mid})`);
                        console.log(`    - Record 1: ${list[j].timestamp} (${list[j].className})`);
                        console.log(`    - Record 2: ${list[j+1].timestamp} (${list[j+1].className})`);
                        console.log(`    - Interval: ${diffMin.toFixed(2)} min`);
                        foundOnDate = true;
                    }
                }
            }
        });
        if (!foundOnDate) console.log('   (No short-interval duplicates found)');
    }
}

findRecentDuplicates().catch(console.error);
