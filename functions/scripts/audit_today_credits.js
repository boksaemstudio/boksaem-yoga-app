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

async function auditTodayCredits() {
    const today = "2026-02-15";
    console.log(`=== AUDITING CREDITS FOR ${today} ===\n`);

    // 1. Get all attendance records for today (No order by to avoid index error)
    const attendanceSnap = await db.collection('attendance')
        .where('date', '==', today)
        .get();

    if (attendanceSnap.empty) {
        console.log("No attendance records found for today.");
        return;
    }

    // Sort in memory
    const docs = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));

    const memberIds = [...new Set(docs.map(d => d.memberId))];
    
    // 2. Get current member data
    const memberDataMap = {};
    for (const id of memberIds) {
        const mSnap = await db.collection('members').doc(id).get();
        if (mSnap.exists) {
            memberDataMap[id] = mSnap.data();
        }
    }

    // 3. Analyze each member
    console.log(`ID | Name | Time | Log Credits | Current Credits | Status`);
    console.log(`---|---|---|---|---|---`);

    attendanceSnap.docs.forEach(doc => {
        const att = doc.data();
        const member = memberDataMap[att.memberId];
        const logCredits = att.credits;
        const currentCredits = member ? member.credits : 'N/A';
        const name = att.memberName || (member ? member.name : 'Unknown');
        const time = new Date(att.timestamp).toLocaleTimeString('ko-KR', { hour12: false });

        // Logic Check: The last log for a member should match current credits
        // (Assuming no other changes happened since then)
        const isMatch = (logCredits === currentCredits);
        const status = isMatch ? "✅ Match" : "⚠️ Diff (Normal if multiple logs)";

        console.log(`${att.memberId.slice(-4)} | ${name} | ${time} | ${logCredits} | ${currentCredits} | ${status}`);
    });

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total Attendance Records: ${attendanceSnap.size}`);
    console.log(`Unique Members: ${memberIds.length}`);
}

auditTodayCredits().catch(console.error);
