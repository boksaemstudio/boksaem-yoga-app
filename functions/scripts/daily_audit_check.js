const admin = require('firebase-admin');

// Initialize with application default credentials, assuming project is configured
if (!admin.apps.length) {
    // try to load the default config (if this script runs in functions dir, we might need a service account, but usually firebase-admin works locally via emulator or default ADC)
    admin.initializeApp();
}

const db = admin.firestore();

async function checkIntegrity() {
    console.log("--- Checking Members for Negative Credits ---");
    const membersSnap = await db.collection('members').where('credits', '<', 0).get();
    if (membersSnap.empty) {
        console.log("✅ No members with negative credits found.");
    } else {
        console.log(`❌ Found ${membersSnap.size} members with negative credits:`);
        membersSnap.forEach(doc => console.log(` - ${doc.id}: ${doc.data().name} (${doc.data().credits} credits)`));
    }

    console.log("\n--- Checking Recent Attendance for Duplicates ---");
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    const recentDateStr = recentDate.toISOString();

    const attendanceSnap = await db.collection('attendance').where('timestamp', '>=', recentDateStr).get();
    const attendanceMap = {};
    let duplicatesFiles = 0;

    attendanceSnap.forEach(doc => {
        const data = doc.data();
        if(!data.memberId || !data.date) return;
        const key = `${data.memberId}_${data.date}`;
        if (!attendanceMap[key]) {
            attendanceMap[key] = [];
        }
        attendanceMap[key].push(doc.id);
    });

    for (const [key, ids] of Object.entries(attendanceMap)) {
        if (ids.length > 1) {
            duplicatesFiles++;
            const [memberId, date] = key.split('_');
            console.log(`❌ Duplicate found for member ${memberId} on date ${date}: Docs: ${ids.join(', ')}`);
        }
    }

    if (duplicatesFiles === 0) {
        console.log("✅ No duplicate attendance records found in the last 7 days.");
    }

    // FCM tokens
    console.log("\n--- Checking FCM Tokens ---");
    const tokensSnap = await db.collection('fcm_tokens').get();
    const tokenCounts = {};
    tokensSnap.forEach(doc => {
        const data = doc.data();
        if (data.memberId) {
            tokenCounts[data.memberId] = (tokenCounts[data.memberId] || 0) + 1;
        }
    });

    let excessiveTokens = 0;
    for (const [memberId, count] of Object.entries(tokenCounts)) {
        if (count > 5) {
            excessiveTokens++;
            console.log(`⚠️ Member ${memberId} has ${count} push tokens registered.`);
        }
    }
    
    if (excessiveTokens === 0) {
        console.log("✅ No members with excessive FCM tokens.");
    }
}

checkIntegrity().then(() => {
    console.log("\nAudit Complete.");
    process.exit(0);
}).catch(err => {
    console.error("Audit failed:", err);
    process.exit(1);
});
