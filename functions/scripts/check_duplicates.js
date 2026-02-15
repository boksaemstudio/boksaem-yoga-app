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

async function checkDuplicates() {
    const docId = "gwangheungchang_2026-02-15";
    console.log(`=== CHECKING DUPLICATES IN ${docId} ===`);
    
    const snap = await db.collection('daily_classes').doc(docId).get();
    if (!snap.exists) {
        console.log("Not found.");
        return;
    }
    
    const classes = snap.data().classes || [];
    console.log(`Total classes: ${classes.length}`);
    
    classes.forEach((c, i) => {
        console.log(`\n[${i}] ${c.time} | ${c.title}`);
        console.log(`    Instructor: "${c.instructor}" (Length: ${c.instructor?.length})`);
        // Check for special characters in instructor name
        if (c.instructor) {
            for (let j = 0; j < c.instructor.length; j++) {
                console.log(`      Char ${j}: ${c.instructor[j]} (CharCode: ${c.instructor.charCodeAt(j)})`);
            }
        }
    });

    // Count identical matches
    const counts = {};
    classes.forEach(c => {
        const key = `${c.time}_${c.title}`;
        counts[key] = (counts[key] || 0) + 1;
    });

    console.log("\nCounts per [Time_Title]:", JSON.stringify(counts, null, 2));
}

checkDuplicates().catch(console.error);
