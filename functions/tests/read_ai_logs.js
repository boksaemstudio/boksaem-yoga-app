const admin = require("firebase-admin");

if (admin.apps.length === 0) {
    admin.initializeApp();
}

async function readLogs() {
    const db = admin.firestore();
    console.log("Reading ai_error_logs...");
    const snap = await db.collection("ai_error_logs").orderBy("timestamp", "desc").limit(10).get();
    
    if (snap.empty) {
        console.log("No logs found.");
        return;
    }

    snap.forEach(doc => {
        const data = doc.data();
        console.log("-------------------");
        console.log(`Time: ${data.timestamp?.toDate().toISOString()}`);
        console.log(`Context: ${data.context}`);
        console.log(`Error: ${data.error}`);
    });
}

readLogs().catch(console.error);
