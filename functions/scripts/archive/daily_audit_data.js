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

async function runAudit() {
    console.log("=== DAILY DATA INTEGRITY AUDIT ===\n");

    // 1. Negative Credits
    console.log("[1] Checking for negative credits...");
    const negSnap = await db.collection('members').where('credits', '<', 0).get();
    if (negSnap.empty) {
        console.log("✅ No members with negative credits.");
    } else {
        console.log(`⚠️ Found ${negSnap.size} members with negative credits:`);
        negSnap.docs.forEach(d => console.log(`- ${d.id}: ${d.data().name} (${d.data().credits} credits)`));
    }

    // 2. Error Logs (Last 24h)
    console.log("\n[2] Checking for recent error logs (Last 24h)...");
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const errors = await db.collection('error_logs').where('timestamp', '>', yesterday).get();
    const aiErrors = await db.collection('ai_error_logs').where('timestamp', '>', yesterday).get();
    
    console.log(`- General Errors: ${errors.size}`);
    console.log(`- AI Errors: ${aiErrors.size}`);
    
    if (errors.size > 0) {
        errors.docs.slice(0, 3).forEach(d => console.log(`  > ${d.data().message}`));
    }

    // 3. FCM Tokens
    console.log("\n[3] Checking FCM Token distribution...");
    const tokens = await db.collection('fcm_tokens').get();
    const userMap = {};
    tokens.docs.forEach(d => {
        const uid = d.data().memberId || d.data().userId || 'unknown';
        userMap[uid] = (userMap[uid] || 0) + 1;
    });
    
    const excessive = Object.entries(userMap).filter(([uid, count]) => count > 10);
    if (excessive.length === 0) {
        console.log("✅ No users with excessive FCM tokens.");
    } else {
        console.log(`⚠️ Found ${excessive.length} users with > 10 tokens.`);
    }

    console.log("\n=== AUDIT COMPLETE ===");
}

runAudit().catch(console.error);
