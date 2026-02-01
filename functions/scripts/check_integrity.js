import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Check if credentials are known or fallback
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '../service-account-key.json';
let serviceAccount;

try {
    serviceAccount = require(serviceAccountPath);
} catch (e) {
    console.warn(`Warning: Could not load service account from ${serviceAccountPath}`, e.message);
}

try {
    if (serviceAccount) {
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    } else {
        if (!admin.apps.length) {
            admin.initializeApp();
        }
    }
} catch (e) {
    console.warn("Failed to initialize admin:", e.message);
}

const db = admin.firestore();

async function runAudit() {
    console.log("=== DAILY AUDIT START ===");
    const risks = [];

    // 1. Check Negative Credits
    console.log("[1] Checking Members with Negative Credits...");
    try {
        const negCreditsSnap = await db.collection('members')
            .where('credits', '<', 0)
            .get();

        if (!negCreditsSnap.empty) {
            negCreditsSnap.forEach(doc => {
                const m = doc.data();
                const msg = `Risk: Member [${m.name}] (${doc.id}) has negative credits: ${m.credits}`;
                console.log(msg);
                risks.push(msg);
            });
        } else {
            console.log("PASS: No negative credits found.");
        }
    } catch (e) {
        console.error("Error checking negative credits:", e.message);
        risks.push(`Error checking credits: ${e.message}`);
    }

    // 2. Check Duplicate Attendance (Sample check: Last 24 hours)
    console.log("[2] Checking Potential Duplicate Data (Last 24h)...");
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const logsSnap = await db.collection('attendance')
            .where('timestamp', '>=', yesterday.toISOString())
            .get();

        const seen = new Set();
        let dupeCount = 0;
        logsSnap.forEach(doc => {
            const d = doc.data();
            // Key: member + date + className
            const key = `${d.memberId}_${d.date}_${d.className}`;
            if (seen.has(key)) {
                const msg = `Warning: Potential duplicate check-in found for [${key}] (Doc ID: ${doc.id})`;
                console.log(msg);
                risks.push(msg);
                dupeCount++;
            }
            seen.add(key);
        });
        if (dupeCount === 0) console.log("PASS: No recent duplicates detected.");

    } catch (e) {
        console.error("Error checking duplicates:", e.message);
        risks.push(`Error checking duplicates: ${e.message}`);
    }

    // 3. Check FCM Token Overflow
    console.log("[3] Checking FCM Token Overflow (limit 10)...");
    try {
        // Note: This is expensive to scan all, so we scan a sample or if we had a user index.
        // We'll scan 'fcm_tokens' if it has memberId
        const tokensSnap = await db.collection('fcm_tokens').get();
        const userTokenCounts = {};

        tokensSnap.forEach(doc => {
            const d = doc.data();
            if (d.memberId) {
                userTokenCounts[d.memberId] = (userTokenCounts[d.memberId] || 0) + 1;
            }
        });

        let tokenRiskFound = false;
        Object.entries(userTokenCounts).forEach(([mid, count]) => {
            if (count > 10) {
                const msg = `Risk: Member (${mid}) has ${count} registered push tokens. Cleanup required.`;
                console.log(msg);
                risks.push(msg);
                tokenRiskFound = true;
            }
        });
        if (!tokenRiskFound) console.log("PASS: Token counts normal.");

    } catch (e) {
        console.error("Error checking tokens:", e.message);
        // Non-blocking
    }

    console.log("=== AUDIT COMPLETE ===");
    if (risks.length > 0) {
        console.log("\nSummary of Risks Found:");
        risks.forEach(r => console.log("- " + r));
        process.exit(1); // Exit with error to signal issues
    } else {
        console.log("\nALL CHECKS PASSED.");
        process.exit(0);
    }
}

// Top-level execution
runAudit();
