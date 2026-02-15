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

async function scanHistoricalSimple() {
    console.log("=== SCANNING HISTORICAL ATTENDANCE (SIMPLE) ===");
    
    // Just fetch by date for a few previous Sundays
    const sundays = ["2026-02-08", "2026-02-01", "2026-01-25"];
    
    for (const date of sundays) {
        console.log(`\nDate: ${date}`);
        const snap = await db.collection('attendance')
            .where('date', '==', date)
            .get();
        
        let stats = {};
        snap.forEach(doc => {
            const d = doc.data();
            const key = `${d.className} (${d.branchId})`;
            if (!stats[key]) stats[key] = { count: 0, instructors: new Set() };
            stats[key].count++;
            stats[key].instructors.add(d.instructor || 'null');
        });

        console.log("Class | Count | Instructors");
        Object.keys(stats).forEach(key => {
            const s = stats[key];
            console.log(`${key} | ${s.count} | ${Array.from(s.instructors).join(', ')}`);
        });
    }
}

scanHistoricalSimple().catch(console.error);
