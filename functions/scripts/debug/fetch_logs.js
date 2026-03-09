const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'boksaem-yoga'
    });
}

const db = admin.firestore();

async function fetchWithRetry(fn, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            console.error(`Attempt ${i + 1} failed:`, err.message);
            if (i === retries - 1) throw err;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

async function run() {
    console.log('Fetching logs and attendance...');
    try {
        const results = {};

        // 1. Fetch recent error logs
        const errorLogsSnap = await fetchWithRetry(() => 
            db.collection('error_logs')
                .orderBy('timestamp', 'desc')
                .limit(20)
                .get()
        );
        results.error_logs = errorLogsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Fetch attendance at 19:54 (10:54 UTC)
        const attendanceSnap = await fetchWithRetry(() =>
            db.collection('attendance')
                .where('date', '==', '2026-03-07')
                .orderBy('timestamp', 'desc')
                .limit(20)
                .get()
        );
        results.attendance = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const outputPath = path.join(__dirname, 'debug_data.json');
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        console.log(`Debug data written to ${outputPath}`);
        process.exit(0);
    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    }
}

run();
