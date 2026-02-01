
const admin = require('firebase-admin');
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS || '../service-account-key.json');

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) {
    if (!admin.apps.length) admin.initializeApp();
}

const db = admin.firestore();

async function runCleanup() {
    console.log("=== DUPLICATE CLEANUP START ===");

    // 1. Get recent logs (Last 7 days to be safe, or just scan all if volume allows. Scanner showed issues in Jan)
    // The scanner looked at "Last 24h" but the logs showed dates like 2026-01-25. 
    // Let's look at logs since 2026-01-01 to be comprehensive for this "New Year" period.

    const snapshot = await db.collection('attendance')
        .where('timestamp', '>=', '2026-01-01T00:00:00Z')
        .orderBy('timestamp', 'asc') // Oldest first
        .get();

    console.log(`Fetched ${snapshot.size} logs.`);

    const groups = {}; // Key: memberId_date_className -> [docs]

    snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.memberId || !data.date || !data.className) return;

        const key = `${data.memberId}_${data.date}_${data.className}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push({ id: doc.id, timestamp: data.timestamp, ...data });
    });

    let deletedCount = 0;
    const batchSize = 400;
    let batch = db.batch();
    let opCount = 0;

    for (const key in groups) {
        const docs = groups[key];
        if (docs.length < 2) continue;

        // Sort by timestamp asc
        docs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Logic: Keep first. Check subsequent.
        // If subsequent is within 60 mins of "kept", delete it.
        // If > 60 mins, keep it and treat as new "anchor".

        let anchor = docs[0];
        // Keep logs of what we delete for report

        for (let i = 1; i < docs.length; i++) {
            const curr = docs[i];
            const timeDiff = (new Date(curr.timestamp) - new Date(anchor.timestamp)) / (1000 * 60); // minutes

            if (timeDiff < 60) {
                // It's a duplicate session (within 1 hour)
                // Delete curr
                console.log(`Deleting Duplicate: [${curr.memberName}] ${curr.date} ${curr.className} (+${timeDiff.toFixed(1)}m)`);
                const ref = db.collection('attendance').doc(curr.id);
                batch.delete(ref);

                // Also need to revert member credits/stats?
                // This is risky. If we just delete the log, the member stats (attendanceCount) remain inflated.
                // We should decrement attendanceCount and increment credits for the member.
                // ONLY if it was a valid checkin that consumed credit.
                if (curr.type !== 'manual_no_credit') { // Assuming standard types consume credit
                    const memberRef = db.collection('members').doc(curr.memberId);
                    batch.update(memberRef, {
                        attendanceCount: admin.firestore.FieldValue.increment(-1),
                        credits: admin.firestore.FieldValue.increment(1)
                    });
                }

                deletedCount++;
                opCount++;
            } else {
                // Distinct session
                anchor = curr;
            }

            if (opCount >= batchSize) {
                await batch.commit();
                batch = db.batch();
                opCount = 0;
            }
        }
    }

    if (opCount > 0) {
        await batch.commit();
    }

    console.log(`Cleanup Complete. Deleted ${deletedCount} duplicate records.`);
}

runCleanup().catch(console.error);
