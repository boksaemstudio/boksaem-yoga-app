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

async function inspectDailyClasses() {
    const today = "2026-02-15";
    const branches = ['gwangheungchang', 'mapo'];
    
    console.log(`=== INSPECTING DAILY CLASSES FOR ${today} ===`);
    
    for (const branchId of branches) {
        const docId = `${branchId}_${today}`;
        console.log(`\nDoc ID: ${docId}`);
        const snap = await db.collection('daily_classes').doc(docId).get();
        
        if (snap.exists) {
            const data = snap.data();
            console.log("Data:", JSON.stringify(data, null, 2));
        } else {
            console.log("❌ Document not found.");
        }
    }
}

inspectDailyClasses().catch(console.error);
