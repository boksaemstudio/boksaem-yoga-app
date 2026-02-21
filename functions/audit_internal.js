const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function audit() {
    console.log("=== Starting Data Integrity Audit ===");
    
    // 1. Check for Negative Credits
    const negativeCredits = await db.collection('members').where('credits', '<', 0).get();
    console.log(`[Members] Found ${negativeCredits.size} members with negative credits.`);
    negativeCredits.docs.forEach(doc => {
        console.log(` - Member: ${doc.data().name} (${doc.id}), Credits: ${doc.data().credits}`);
    });

    // 2. Check for Duplicate Attendance (Simple approach: same member, same date, multiple records)
    // We'll look at today's attendance (KST)
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const attendanceSnap = await db.collection('attendance').where('date', '==', today).get();
    const attMap = {};
    const dupes = [];
    attendanceSnap.docs.forEach(doc => {
        const data = doc.data();
        const key = `${data.memberId}_${data.date}`;
        if (!attMap[key]) attMap[key] = [];
        attMap[key].push({ id: doc.id, ...data });
    });

    Object.entries(attMap).forEach(([key, records]) => {
        if (records.length > 1) {
            console.log(`[Attendance] Multiple entries for ${key}: ${records.length} records found.`);
            records.forEach(r => {
                console.log(`   - ID: ${r.id}, Timestamp: ${r.timestamp}, Class: ${r.className}`);
            });
        }
    });

    // 3. AI Quota & Errors
    const quotaSnap = await db.collection('ai_quota').doc(today).get();
    if (quotaSnap.exists) {
        console.log(`[AI] Quota usage for ${today}: ${quotaSnap.data().count}`);
    } else {
        console.log(`[AI] No quota record found for ${today}.`);
    }

    const aiErrors = await db.collection('ai_error_logs').orderBy('timestamp', 'desc').limit(5).get();
    console.log(`[AI] Recent Errors (Last 5):`);
    aiErrors.docs.forEach(doc => {
        console.log(` - [${doc.data().timestamp?.toDate()?.toISOString()}] ${doc.data().context}: ${doc.data().error}`);
    });

    // 4. FCM Token Hygiene
    const tokensSnap = await db.collection('fcm_tokens').get();
    const tokenCounts = {};
    tokensSnap.docs.forEach(doc => {
        const mid = doc.data().memberId || doc.data().instructorName || 'unknown';
        tokenCounts[mid] = (tokenCounts[mid] || 0) + 1;
    });

    console.log(`[FCM] Checking for excessive tokens...`);
    Object.entries(tokenCounts).forEach(([id, count]) => {
        if (count >= 10) {
            console.log(` - User ${id} has ${count} tokens registered.`);
        }
    });

    console.log("=== Audit Complete ===");
    process.exit(0);
}

audit().catch(err => {
    console.error("Audit failed:", err);
    process.exit(1);
});
