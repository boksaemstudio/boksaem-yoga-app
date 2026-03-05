const admin = require('firebase-admin');
if (admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

async function checkLogs() {
    console.log("Checking AI Error Logs...");
    const snap = await db.collection('ai_error_logs').orderBy('timestamp', 'desc').limit(5).get();
    if (snap.empty) {
        console.log("No logs found in ai_error_logs.");
    } else {
        snap.forEach(doc => {
            console.log(`--- Log ${doc.id} ---`);
            console.log(JSON.stringify(doc.data(), null, 2));
        });
    }

    console.log("\nChecking General Error Logs...");
    const snap2 = await db.collection('error_logs').orderBy('timestamp', 'desc').limit(5).get();
    if (snap2.empty) {
        console.log("No logs found in error_logs.");
    } else {
        snap2.forEach(doc => {
            console.log(`--- Log ${doc.id} ---`);
            console.log(JSON.stringify(doc.data(), null, 2));
        });
    }
}

checkLogs().catch(console.error);
