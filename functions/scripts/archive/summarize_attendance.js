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

async function summarizeAttendance() {
    const today = "2026-02-15";
    console.log(`=== ATTENDANCE SUMMARY FOR ${today} ===`);
    
    const snapshot = await db.collection('attendance')
        .where('date', '==', today)
        .get();
    
    let stats = {};

    snapshot.forEach(doc => {
        const data = doc.data();
        const key = `${data.branchId} | ${data.className}`;
        if (!stats[key]) stats[key] = { count: 0, instructors: new Set() };
        stats[key].count++;
        stats[key].instructors.add(data.instructor || 'null/undefined');
    });

    console.log("Branch | Class Name | Total | Instructors Found");
    console.log("-----------------------------------------------");
    Object.keys(stats).sort().forEach(key => {
        const s = stats[key];
        console.log(`${key} | ${s.count} | ${Array.from(s.instructors).join(', ')}`);
    });
}

summarizeAttendance().catch(console.error);
