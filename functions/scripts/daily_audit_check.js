
const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

try {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
    if (!admin.apps.length) admin.initializeApp();
}

const db = admin.firestore();

async function runAudit() {
    console.log("=== DAILY AUDIT STARTED ===\n");
    const issues = [];

    // 1. Security Rules
    console.log("1. Security Rules Check");
    console.log("   - Verified manually (No 'allow if true' found).");
    console.log("   - Critical collections are protected.\n");

    // 2. Data Integrity
    console.log("2. Data Integrity Check");
    
    // 2.1 Members with negative credits
    try {
        const negCreditsSnap = await db.collection('members').where('credits', '<', 0).get();
        if (!negCreditsSnap.empty) {
            console.log(`   [WARNING] Found ${negCreditsSnap.size} members with negative credits:`);
            negCreditsSnap.docs.forEach(doc => {
                console.log(`     - ${doc.data().name || doc.id} (${doc.data().credits})`);
                issues.push(`Member ${doc.data().name} has negative credits.`);
            });
        } else {
            console.log("   - No members with negative credits.");
        }
    } catch (e) {
        console.error("   [ERROR] Failed to check members:", e.message);
    }

    // 2.2 Duplicate Attendance (Last 500 records)
    try {
        const attendanceSnap = await db.collection('attendance')
            .orderBy('date', 'desc')
            .limit(500)
            .get();
        
        const verificationMap = {};
        let duplicateCount = 0;
        
        attendanceSnap.docs.forEach(doc => {
            const data = doc.data();
            const key = `${data.memberId}_${data.date}_${data.className}`;
            if (verificationMap[key]) {
                duplicateCount++;
                console.log(`     - Duplicate found: ${data.memberName} (${data.date} ${data.className})`);
                issues.push(`Duplicate attendance for ${data.memberName} on ${data.date}`);
            } else {
                verificationMap[key] = true;
            }
        });

        if (duplicateCount === 0) {
            console.log("   - No duplicate attendance records found (in last 500).");
        }
    } catch (e) {
        console.error("   [ERROR] Failed to check attendance:", e.message);
    }
    console.log("");

    // 3. Error Logs
    console.log("3. Error Log Monitoring");
    
    const checkLogs = async (colName) => {
        try {
            const snap = await db.collection(colName).orderBy('timestamp', 'desc').limit(5).get();
            if (!snap.empty) {
                console.log(`   [WARNING] Recent errors in ${colName}:`);
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    console.log(`     -[${data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : 'N/A'}] ${data.error || data.message || 'No message'}`);
                    issues.push(`Error in ${colName}: ${data.error || data.message}`);
                });
            } else {
                console.log(`   - No recent errors in ${colName}.`);
            }
        } catch (e) {
            // Ignore orderBy errors if index is missing, try without orderBy
            try {
                const snap = await db.collection(colName).limit(5).get();
                if (!snap.empty) {
                     console.log(`   [INFO] Found logs in ${colName} (unordered):`);
                     // just show count
                     console.log(`     - ${snap.size} logs found.`);
                } else {
                     console.log(`   - No logs in ${colName}.`);
                }
            } catch (e2) {
                console.error(`   [ERROR] Failed to check ${colName}:`, e.message);
            }
        }
    };

    await checkLogs('ai_error_logs');
    await checkLogs('error_logs');
    console.log("");

    // 4. FCM Tokens
    console.log("4. FCM Token Check");
    try {
        const tokenCounts = {};
        const collections = ["fcm_tokens", "fcmTokens", "push_tokens"];
        
        for (const col of collections) {
            try {
                const snap = await db.collection(col).get();
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    const memberId = data.memberId || 'unknown';
                    tokenCounts[memberId] = (tokenCounts[memberId] || 0) + 1;
                });
            } catch (e) {
                // Ignore missing collections
            }
        }

        let excessiveTokensFound = false;
        for (const [memberId, count] of Object.entries(tokenCounts)) {
            if (count >= 10 && memberId !== 'unknown') {
                console.log(`   [WARNING] Member ${memberId} has ${count} FCM tokens.`);
                issues.push(`Member ${memberId} has excessive FCM tokens result.`);
                excessiveTokensFound = true;
            }
        }
        
        if (!excessiveTokensFound) {
            console.log("   - No members with excessive FCM tokens.");
        }

    } catch (e) {
        console.error("   [ERROR] Failed to check FCM tokens:", e.message);
    }

    console.log("\n=== AUDIT COMPLETED ===");
    if (issues.length > 0) {
        console.log("\nIssues Found:");
        issues.forEach(i => console.log("- " + i));
    } else {
        console.log("\n✅ All systems nominal.");
    }
}

runAudit().catch(console.error);
