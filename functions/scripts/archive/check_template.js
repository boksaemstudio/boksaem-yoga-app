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

async function checkTemplate() {
    console.log("=== CHECKING WEEKLY TEMPLATES ===");
    const branches = ['gwangheungchang', 'mapo'];
    
    for (const branchId of branches) {
        console.log(`\n--- Branch: ${branchId} ---`);
        const doc = await db.collection('weekly_templates').doc(branchId).get();
        if (!doc.exists) {
            console.log("No template found.");
            continue;
        }

        const data = doc.data();
        const classes = data.classes || [];
        let foundInner = 0;

        classes.forEach((cls, i) => {
            const instructor = cls.instructor;
            if (!instructor || instructor === '미지정' || instructor.trim() === '') {
                console.log(`[!] Template Found: Day: ${cls.days.join(',')}, Time: ${cls.startTime}, Title: ${cls.className} (Instructor: '${instructor}')`);
                foundInner++;
            }
        });

        if (foundInner === 0) console.log("✅ No undesignated classes in this template.");
    }
}

checkTemplate().catch(console.error);
