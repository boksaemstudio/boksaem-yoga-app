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

async function getDetailedAttendance() {
    const today = "2026-02-15";
    console.log(`=== DETAILED ATTENDANCE FOR ${today} ===`);
    
    const snapshot = await db.collection('attendance')
        .where('date', '==', today)
        .where('className', '==', '하타 인텐시브')
        .get();
    
    const records = [];
    snapshot.forEach(doc => {
        records.push({ id: doc.id, ...doc.data() });
    });

    // Sort by timestamp
    records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    records.forEach(r => {
        console.log(`[${r.timestamp}] ${r.memberName} - ${r.className} (Instructor: ${r.instructor})`);
        if (r.debugReason) console.log(`   - Debug: ${r.debugReason}`);
    });
}

getDetailedAttendance().catch(console.error);
