
import admin from 'firebase-admin';
import { createRequire } from 'module';
import { getFirestore } from 'firebase-admin/firestore';
import { performance } from 'perf_hooks';

const require = createRequire(import.meta.url);
const serviceAccount = require('../../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = getFirestore();

async function measure(label, fn) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = (end - start).toFixed(2);
    console.log(`[PERF] ${label}: ${duration}ms`);
    return result;
}

async function checkPerformance() {
    console.log("🚀 Starting DB Performance Scan...");

    // 1. Fetch All Members (Simulate Admin Dashboard Load)
    await measure("Fetch All Members (Admin List)", async () => {
        const snap = await db.collection('members').get();
        console.log(`   -> Retrieved ${snap.size} members`);
    });

    // 2. Fetch Recent Attendance (Simulate Admin Dashboard Logs)
    await measure("Fetch Recent Attendance (Limit 50)", async () => {
        const snap = await db.collection('attendance')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        console.log(`   -> Retrieved ${snap.size} logs`);
    });

    // 3. Fetch Single Member Details (Simulate Detailed View)
    await measure("Fetch Member Details (sim_active)", async () => {
        const doc = await db.collection('members').doc('sim_active').get();
        if (doc.exists) console.log(`   -> Found ${doc.data().name}`);
    });

    // 4. Fetch Member Logs (Simulate Member Profile History)
    await measure("Fetch Member Logs (sim_active)", async () => {
        const snap = await db.collection('attendance')
            .where('memberId', '==', 'sim_active')
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();
        console.log(`   -> Retrieved ${snap.size} personal logs`);
    });

    console.log("✅ Performance Scan Complete.");
}

checkPerformance().catch(console.error);
