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

async function checkMemberHistory(memberId) {
    console.log(`=== HISTORY FOR MEMBER: ${memberId} ===`);
    
    // 1. Current State
    const mSnap = await db.collection('members').doc(memberId).get();
    console.log("Current State:", mSnap.data());

    // 2. Recent Attendance
    const attSnap = await db.collection('attendance')
        .where('memberId', '==', memberId)
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();
        
    console.log("\nRecent Attendance Logs:");
    attSnap.docs.forEach(doc => {
        const d = doc.data();
        console.log(`- ${d.date} ${new Date(d.timestamp).toLocaleTimeString('ko-KR')}: [${d.className}] LogCredits: ${d.credits}`);
    });
}

// Also check who checked in twice today
async function findDoubleCheckIns() {
    const today = "2026-02-15";
    const snap = await db.collection('attendance').where('date', '==', today).get();
    const counts = {};
    snap.docs.forEach(doc => {
        const mid = doc.data().memberId;
        counts[mid] = (counts[mid] || 0) + 1;
    });
    
    console.log("\nDouble Check-ins today:");
    for (const [mid, count] of Object.entries(counts)) {
        if (count > 1) {
            console.log(`Member ID: ${mid} checked in ${count} times.`);
        }
    }
}

async function run() {
    await checkMemberHistory("jpTu7VofRzX99W5X1V9f"); // 황화정 full ID based on previous view or guess
    // Wait, I need the full ID. I'll get it from the member search first.
}

async function findFullIdAndRun() {
    const snap = await db.collection('members').where('name', '==', '황화정').get();
    if (!snap.empty) {
        const id = snap.docs[0].id;
        await checkMemberHistory(id);
    }
    await findDoubleCheckIns();
}

findFullIdAndRun().catch(console.error);
