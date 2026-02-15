var admin = require("firebase-admin");
var serviceAccount = require("../service-account-key.json");

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {
  if (!admin.apps.length)
    admin.initializeApp();
}

const db = admin.firestore();

async function checkSystemLogs() {
    const today = "2026-02-15";
    console.log(`=== CHECKING SYSTEM LOGS FOR ${today} ===`);
    
    // 1. Error Logs
    console.log("\n--- Recent Error Logs ---");
    const errorSnap = await db.collection('error_logs')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
    errorSnap.forEach(doc => {
        const d = doc.data();
        console.log(`[${d.timestamp}] ${d.message}`);
    });

    // 2. Login Failures (to see if there were session issues)
    console.log("\n--- Recent Login Failures ---");
    const loginSnap = await db.collection('login_failures')
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();
    loginSnap.forEach(doc => {
        const d = doc.data();
        console.log(`[${d.timestamp}] ${d.type} - ${d.attemptedName} (${d.errorMessage})`);
    });

    // 3. Check for any "TTC" specific schedules or docs
    console.log("\n--- Checking for TTC or Other Schedule Docs ---");
    const ttcSnap = await db.collection('daily_classes')
        .where('date', '==', today)
        .get();
    
    console.log(`Total daily_classes docs for today: ${ttcSnap.size}`);
    ttcSnap.forEach(doc => {
        console.log(`- Doc: ${doc.id}`);
    });
}

checkSystemLogs().catch(console.error);
