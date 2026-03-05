const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkHwang() {
    console.log("Searching for 황화정...");
    const snap = await db.collection('members').where('name', '==', '황화정').get();
    
    if (snap.empty) {
        console.log("Member not found");
        return;
    }
    
    const member = snap.docs[0];
    console.log("Member found:", member.id, "Total Attendance Count:", member.data().attendanceCount, "Credits:", member.data().credits);
    
    // Get today's local KST date string manually
    const todayStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());

    console.log("Today is:", todayStr);
    
    const attSnap = await db.collection('attendance')
        .where('memberId', '==', member.id)
        .where('date', '==', todayStr)
        .get();
    
    console.log(`Found ${attSnap.size} attendance records today.`);
    attSnap.docs.forEach((doc, idx) => {
        const d = doc.data();
        console.log(`[${idx+1}]`, doc.id, d.timestamp, d.className, d.status, d.sessionNumber, "duplicate:", d.isDuplicate);
    });

    // Also get all attendances recently to see if it counted everything right
    const recentAtt = await db.collection('attendance')
        .where('memberId', '==', member.id)
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();
        
    console.log("\nRecent 5 check-ins overall:");
    recentAtt.docs.forEach((doc, idx) => {
        const d = doc.data();
        console.log(`[${idx+1}]`, doc.id, d.date, d.timestamp, d.className, d.status, d.sessionNumber);
    });
}

checkHwang().catch(console.error);
