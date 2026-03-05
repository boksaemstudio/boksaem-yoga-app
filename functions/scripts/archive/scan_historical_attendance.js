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

async function scanHistorical() {
    console.log("=== SCANNING HISTORICAL ATTENDANCE FOR '하타 인텐시브' ===");
    
    const snapshot = await db.collection('attendance')
        .where('className', '==', '하타 인텐시브')
        .orderBy('date', 'desc')
        .limit(100)
        .get();
    
    let stats = {};
    snapshot.forEach(doc => {
        const d = doc.data();
        const key = `${d.date} | ${d.branchId}`;
        if (!stats[key]) stats[key] = { count: 0, instructors: new Set() };
        stats[key].count++;
        stats[key].instructors.add(d.instructor || 'null');
    });

    console.log("Date | Branch | Count | Instructors");
    console.log("------------------------------------");
    Object.keys(stats).sort().reverse().forEach(key => {
        const s = stats[key];
        console.log(`${key} | ${s.count} | ${Array.from(s.instructors).join(', ')}`);
    });
}

scanHistorical().catch(console.error);
