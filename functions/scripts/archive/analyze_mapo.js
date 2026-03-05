const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'service-account-key.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function analyzeMapoLog() {
    console.log('=== Mapo Branch Network Analysis (2026-02-16) ===');
    const startTime = '2026-02-16T00:00:00.000Z'; 
    
    // Simplified query to avoid index requirement
    // Query by timestamp only, then filter in memory
    const attSnap = await db.collection('attendance')
        .where('timestamp', '>=', startTime)
        .orderBy('timestamp', 'asc')
        .get();

    if (attSnap.empty) {
        console.log(' -> No attendance records found for today.');
        return;
    }

    // Filter for Mapo in memory
    const mapoDocs = attSnap.docs.filter(doc => doc.data().branchId === 'mapo');

    if (mapoDocs.length === 0) {
        console.log(' -> No attendance records found for Mapo today.');
        return;
    }

    console.log(`Found ${mapoDocs.length} records for Mapo.`);
    let offlineCount = 0;
    let autoSyncCount = 0;
    let manualSyncCount = 0;

    mapoDocs.forEach(doc => {
        const data = doc.data();
        const syncMode = data.syncMode || 'auto'; // 'auto' means normal online check-in
        const status = data.status;
        
        console.log(` [${data.memberName}] ${data.className} / ${data.instructor} / ${syncMode} / ${data.timestamp}`);

        if (syncMode.includes('offline')) offlineCount++;
        if (syncMode.includes('manual')) manualSyncCount++;
        if (syncMode === 'auto') autoSyncCount++;
    });

    console.log(`\n=== Summary ===`);
    console.log(`Total: ${attSnap.size}`);
    console.log(`Correction (Manual/Offline): ${offlineCount + manualSyncCount}`);
    console.log(`Normal (Online): ${autoSyncCount}`);

    if (offlineCount + manualSyncCount > 0) {
        console.log(`⚠️ Mapo also experienced some connectivity issues.`);
    } else {
        console.log(`✅ Mapo seems to have been stable (All records are 'auto').`);
    }
}

analyzeMapoLog();
