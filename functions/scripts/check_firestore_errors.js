const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json"); // Ensure this path is correct or use default credential

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkErrors() {
    console.log("🔍 Checking 'ai_error_logs' collection...");
    try {
        const snapshot = await db.collection('ai_error_logs')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        if (snapshot.empty) {
            console.log("✅ No errors found in 'ai_error_logs'.");
            return;
        }

        console.log(`⚠️ Found ${snapshot.size} recent errors:`);
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`\n[${doc.id}] Time: ${data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp}`);
            console.log(`Context: ${data.context}`);
            console.log(`Error: ${JSON.stringify(data.error)}`);
        });

    } catch (e) {
        console.error("❌ Failed to query error logs:", e);
    }
}

checkErrors();
