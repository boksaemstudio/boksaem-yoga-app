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

async function deepInspect() {
    const dates = ["2026-02-14", "2026-02-15", "2026-02-16"];
    const branches = ['gwangheungchang', 'mapo'];
    
    console.log("=== DEEP INSPECTION OF DAILY CLASSES ===");
    
    for (const date of dates) {
        for (const branchId of branches) {
            const docId = `${branchId}_${date}`;
            const snap = await db.collection('daily_classes').doc(docId).get();
            
            if (snap.exists) {
                const data = snap.data();
                console.log(`\nDoc ID: ${docId} (Updated: ${data.updatedAt})`);
                data.classes.forEach((cls, i) => {
                    console.log(`  [${i}] Title: "${cls.title || cls.className}" | Time: "${cls.time || cls.startTime}"`);
                    console.log(`      Raw Fields: ${Object.keys(cls).join(', ')}`);
                    console.log(`      Instructor: "${cls.instructor}" | InstructorName: "${cls.instructorName}"`);
                });
            } else {
                console.log(`\nDoc ID: ${docId} -> ❌ NOT FOUND`);
            }
        }
    }
}

deepInspect().catch(console.error);
