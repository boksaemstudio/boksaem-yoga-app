import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '../service-account-key.json';
let serviceAccount;

try {
    serviceAccount = require(serviceAccountPath);
} catch (e) {
    console.warn(`Warning: Could not load service account from ${serviceAccountPath}`, e.message);
}

if (!admin.apps.length) {
    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        admin.initializeApp();
    }
}

const db = admin.firestore();

async function fixSalesBranchId() {
    console.log("=== SALES DATA BRANCH_ID FIX START ===");
    
    // 1. Load all members to map memberId -> homeBranch
    const membersSnap = await db.collection('members').get();
    const memberBranchMap = new Map();
    membersSnap.forEach(doc => {
        const data = doc.data();
        if (data.homeBranch) {
            memberBranchMap.set(doc.id, data.homeBranch);
        }
    });
    console.log(`Loaded ${memberBranchMap.size} members with branch info.`);

    // 2. Load sales records with missing branchId
    const salesSnap = await db.collection('sales').get();
    let fixCount = 0;
    let skipCount = 0;
    
    const batch = db.batch();

    for (const doc of salesSnap.docs) {
        const s = doc.data();
        if (!s.branchId) {
            const memberId = s.memberId;
            const homeBranch = memberBranchMap.get(memberId);
            
            if (homeBranch) {
                console.log(`Fixing sales record ${doc.id} (Member: ${s.memberName}): branchId = ${homeBranch}`);
                batch.update(doc.ref, { branchId: homeBranch });
                fixCount++;
            } else {
                console.warn(`Could not fix sales record ${doc.id} (Member: ${s.memberName}): Member branch info missing.`);
                skipCount++;
            }
        }
    }

    if (fixCount > 0) {
        await batch.commit();
        console.log(`Successfully committed ${fixCount} fixes.`);
    } else {
        console.log("No records needed fixing.");
    }

    console.log(`Total fixed: ${fixCount}, Skipped: ${skipCount}`);
    console.log("=== SALES DATA BRANCH_ID FIX COMPLETE ===");
}

fixSalesBranchId().catch(console.error);
