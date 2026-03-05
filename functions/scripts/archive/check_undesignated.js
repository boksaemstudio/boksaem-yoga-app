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

async function checkUndesignated() {
    console.log("=== CHECKING UNDESIGNATED CLASSES ===");
    
    // Check Feb 2026
    const year = 2026;
    const month = 2;
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month).padStart(2, '0')}-28`; // Feb 2026 ends on 28th

    console.log(`Checking from ${startStr} to ${endStr}...`);

    const branches = ['gwangheungchang', 'mapo'];
    let foundCount = 0;

    for (const branchId of branches) {
        console.log(`\n--- Branch: ${branchId} ---`);
        const snapshot = await db.collection('daily_classes')
            .where('branchId', '==', branchId)
            .where('date', '>=', startStr)
            .where('date', '<=', endStr)
            .get();
        
        if (snapshot.empty) {
            console.log("No classes found.");
            continue;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.date;
            const classes = data.classes || [];

            classes.forEach(cls => {
                const instructor = cls.instructor;
                const isUndesignated = !instructor || instructor === '미지정' || instructor.trim() === '';
                
                if (isUndesignated) {
                    console.log(`[!] Found: ${date} ${cls.time} ${cls.title} (Instructor: '${instructor}')`);
                    foundCount++;
                }
            });
        });
    }

    if (foundCount === 0) {
        console.log("\n✅ No undesignated classes found.");
    } else {
        console.log(`\n⚠️ Found ${foundCount} undesignated classes.`);
    }
}

checkUndesignated().catch(console.error);
