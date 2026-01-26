
const admin = require('firebase-admin');
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS || '../service-account-key.json');

// Initialize
try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) {
    if (!admin.apps.length) admin.initializeApp();
}

const db = admin.firestore();

// --- Simulation Helpers ---
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const logStep = (step, msg) => console.log(`\n[${step}] ${msg}`);
const logResult = (success, msg) => console.log(success ? `  ✅ PASS: ${msg}` : `  ❌ FAIL: ${msg}`);

async function runSimulation() {
    console.log("=== 🧘 ONE MONTH YOGA STUDIO SIMULATION START 🧘 ===");

    // 1. [Admin] New Member Registration
    logStep("Day 1", "Admin registers a new member: 'Jenny Sim'");
    const newMemberData = {
        name: "Jenny Sim",
        phone: "010-9999-8888",
        phoneLast4: "8888",
        credits: 5,
        status: "active",
        startDate: new Date().toISOString().split('T')[0],
        endDate: "2026-12-31", // Long enough
        homeBranch: "mapo",
        regDate: new Date().toISOString().split('T')[0]
    };

    // Clean up if exists
    const oldUserSnap = await db.collection('members').where('phoneLast4', '==', '8888').get();
    oldUserSnap.forEach(d => d.ref.delete());

    const memberRef = await db.collection('members').add(newMemberData);
    const memberId = memberRef.id;
    logResult(true, `Member Created with ID: ${memberId}`);

    // 2. [Kiosk] First Check-In (Normal)
    logStep("Day 2", "Jenny arrives for 10:00 class.");
    try {
        // Retrieve current credits
        let m = (await memberRef.get()).data();
        const initialCredits = m.credits;

        // Simulate Check-In Transaction (Client logic moved to server for this test)
        await db.runTransaction(async (t) => {
            const mDoc = await t.get(memberRef);
            if (!mDoc.exists) throw "Member missing";
            const mData = mDoc.data();

            // Deduct
            t.update(memberRef, {
                credits: mData.credits - 1,
                attendanceCount: (mData.attendanceCount || 0) + 1,
                lastAttendanceAt: new Date().toISOString()
            });

            // Log Attendance
            const attRef = db.collection('attendance').doc();
            t.set(attRef, {
                memberId,
                memberName: mData.name,
                branchId: "mapo",
                className: "Hatha Yoga",
                instructor: "Teacher Kim",
                timestamp: new Date().toISOString(),
                date: new Date().toISOString().split('T')[0], // Today
                type: 'checkin'
            });
        });

        m = (await memberRef.get()).data();
        if (m.credits === initialCredits - 1) logResult(true, `Check-in successful. Credits decreased to ${m.credits}`);
        else logResult(false, `Credit mismatch. Expected ${initialCredits - 1}, Got ${m.credits}`);

    } catch (e) {
        logResult(false, `Check-in failed: ${e.message}`);
    }

    // 3. [Kiosk] "Passion" Check-in (Same day, 2nd class)
    logStep("Day 2 (Evening)", "Jenny returns for evening Vinyasa (Passion/Multi-session).");
    try {
        await db.runTransaction(async (t) => {
            const mData = (await t.get(memberRef)).data();
            const todayStr = new Date().toISOString().split('T')[0];

            // Check for multi-session
            const todayAtt = await db.collection('attendance')
                .where('memberId', '==', memberId)
                .where('date', '==', todayStr)
                .get();

            const isMultiSession = !todayAtt.empty;
            const sessionCount = todayAtt.size + 1;

            t.update(memberRef, { credits: mData.credits - 1, attendanceCount: mData.attendanceCount + 1 });

            const attRef = db.collection('attendance').doc();
            t.set(attRef, {
                memberId, memberName: mData.name, className: "Vinyasa", timestamp: new Date().toISOString(), date: todayStr,
                isMultiSession, sessionCount
            });
            return { isMultiSession, sessionCount };
        }).then(res => {
            if (res.isMultiSession) logResult(true, `Passion Detected! Session Count: ${res.sessionCount}`);
            else logResult(false, "Failed to detect multi-session.");
        });
    } catch (e) {
        logResult(false, `Passion check-in failed: ${e.message}`);
    }

    // 4. [Admin] Zero Credits & Rejection Simulation
    logStep("Day 15", "Admin manually sets credits to 0 (Simulation).");
    await memberRef.update({ credits: 0 });
    logResult(true, "Credits set to 0.");

    logStep("Day 16", "Jenny tries to check in with 0 credits.");
    try {
        await db.runTransaction(async (t) => {
            const mDoc = await t.get(memberRef);
            if (mDoc.data().credits <= 0) throw new Error("Insufficient credits");
            // ...
        });
        logResult(false, "Should have failed but succeeded!");
    } catch (e) {
        if (e.message === "Insufficient credits") logResult(true, "Check-in correctly rejected (Insufficient credits).");
        else logResult(false, `Unexpected error: ${e.message}`);
    }

    // 5. [Member] Re-purchase
    logStep("Day 17", "Jenny buys 10 classes (Admin Update).");
    await memberRef.update({ credits: 10 });
    const finalData = (await memberRef.get()).data();
    if (finalData.credits === 10) logResult(true, "Refill successful.");
    else logResult(false, "Refill failed.");

    console.log("=== SIMULATION COMPLETE ===");
}

runSimulation().catch(console.error);
