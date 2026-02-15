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

async function finalizeAudit() {
    const today = "2026-02-15";
    const mid = "nBqfNnuD4v0hWGQmOcNu"; // The double check-in member
    
    const mSnap = await db.collection('members').doc(mid).get();
    const member = mSnap.data();
    console.log(`=== DOUBLE CHECK-IN MEMBER: ${member.name} (${mid}) ===`);
    console.log(`Current Credits: ${member.credits}`);

    const attSnap = await db.collection('attendance')
        .where('memberId', '==', mid)
        .where('date', '==', today)
        .get();

    const logs = attSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));

    logs.forEach((l, i) => {
        console.log(`Log ${i+1}: [${l.className}] at ${new Date(l.timestamp).toLocaleTimeString('ko-KR')} | LogCredits: ${l.credits}`);
    });

    if (logs.length >= 2) {
        const diff = logs[0].credits - logs[1].credits;
        console.log(`\nCredit gap between check-ins: ${diff}`);
        if (diff === 1) {
            console.log("✅ Correct: 1 credit deducted for the second check-in.");
        } else if (diff === 0) {
            console.log("⚠️ Warning: No credit deducted for second check-in (Maybe duplicate protection error?).");
        }
    }
}

finalizeAudit().catch(console.error);
