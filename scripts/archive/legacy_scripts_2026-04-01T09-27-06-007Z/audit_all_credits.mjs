import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(readFileSync("c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/functions/service-account-key.json", "utf8"));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function auditAllMembers() {
    console.log("=== 🔍 [ADMIN] FULL CREDIT DISCREPANCY AUDIT START ===");
    
    const membersSnap = await db.collection('members').get();
    const allMembers = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    let anomalies = [];
    let totalAffected = 0;

    for (const member of allMembers) {
        // Fetch all attendance for this member (simpler query to avoid index requirements)
        const attSnap = await db.collection('attendance')
            .where('memberId', '==', member.id)
            .get();
        
        // Filter and sort in-memory
        const records = attSnap.docs
            .map(d => d.data())
            .filter(r => r.status === 'valid')
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        if (records.length === 0) continue;

        let missingDeductions = 0;
        let details = [];

        // CASE 1: Single check-in discrepancy (e.g. 1st visit reports same as membership potential)
        // This is tricky because we don't know the exact starting credits always, 
        // but common ones are 10, 20, 24, 30, 40 etc.
        // Also we can compare with the current member.credits.
        const commonInitialValues = [10, 20, 24, 30, 40, 50, 60, 80, 100];
        const first = records[0];
        
        // If the VERY FIRST attendance of a member (or a new membership) reports a full credit amount,
        // it's highly likely it didn't deduct from the member state.
        // Note: This is a heuristic. Let's look for exact matches with common initial values.
        if (records.length === 1 && commonInitialValues.includes(first.credits)) {
             // If member.credits is also the same as first.credits, then it definitely didn't deduct.
             if (member.credits === first.credits) {
                 missingDeductions++;
                 details.push({
                     date: first.date,
                     credits: first.credits,
                     reason: "First visit failed to deduct"
                 });
             }
        }

        // CASE 2: Consecutive identical credits (The previous script's logic)
        for (let i = 0; i < records.length - 1; i++) {
            const current = records[i];
            const next = records[i + 1];

            // If consecutive valid check-ins have the SAME credit count (and not 0), it's an anomaly
            if (current.credits !== undefined && next.credits !== undefined && current.credits === next.credits) {
                if (current.credits === 0) continue; // Skip unlimited or corner cases

                missingDeductions++;
                details.push({
                    date: current.date,
                    credits: current.credits
                });
            }
        }

        if (missingDeductions > 0) {
            anomalies.push({
                name: member.name,
                phone: member.phone || 'N/A',
                currentCredits: member.credits,
                missingCount: missingDeductions,
                details
            });
            totalAffected++;
        }
    }

    console.log("\n=== 🚩 AUDIT RESULTS ===");
    if (anomalies.length === 0) {
        console.log("✅ No credit discrepancies found. System is clean.");
    } else {
        console.log(`❌ Found ${totalAffected} members with potential credit leaks:\n`);
        anomalies.forEach(a => {
            console.log(`[${a.name} (${a.phone.slice(-4)})] - Missing: ${a.missingCount} credits`);
            console.log(`   Current System Credits: ${a.currentCredits}`);
            a.details.forEach(d => {
                console.log(`   - Discrepancy detected around: ${d.date} (${d.credits} credits reported)`);
            });
            console.log("-----------------------------------------");
        });
        
        console.log(`\nTOTAL AFFECTED: ${totalAffected} members.`);
        console.log("These members' credit counts should likely be reduced by the 'Missing' amount.");
    }
    
    console.log("\n=== AUDIT COMPLETE ===");
}

auditAllMembers().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
