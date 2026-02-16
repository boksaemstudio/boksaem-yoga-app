const admin = require('firebase-admin');

// Initialize Admin SDK with Service Account
// Attempt to load from env or local file
let serviceAccount;
try {
    serviceAccount = require('../service-account-key.json');
} catch (e) {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.error("❌ Service account key not found. Please set GOOGLE_APPLICATION_CREDENTIALS or provide 'functions/service-account-key.json'");
        process.exit(1);
    }
}

try {
    if (admin.apps.length === 0) {
        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp();
        }
    }
} catch (e) {
    console.warn("Init warning:", e.message);
}

const db = admin.firestore();

async function findDuplicatePhoneMembers() {
    console.log("🔍 Searching for members with duplicate phone numbers (last 4 digits)...\n");

    try {
        const snapshot = await db.collection('members').get();
        const members = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.phone) {
                // Extract last 4 digits
                const last4 = data.phone.trim().slice(-4);
                if (last4.length === 4 && !isNaN(last4)) {
                    members.push({
                        id: doc.id,
                        name: data.name,
                        phone: data.phone,
                        last4: last4,
                        credits: data.credits || 0,
                        endDate: data.endDate || 'N/A',
                        branch: data.homeBranch || 'N/A'
                    });
                }
            }
        });

        // Group by last 4 digits
        const groups = {};
        members.forEach(m => {
            if (!groups[m.last4]) groups[m.last4] = [];
            groups[m.last4].push(m);
        });

        // Filter for duplicates
        let duplicateCount = 0;
        const sortedGroups = Object.entries(groups)
            .filter(([_, group]) => group.length > 1)
            .sort((a, b) => b[1].length - a[1].length); // Sort by group size descend

        if (sortedGroups.length === 0) {
            console.log("✅ No duplicate phone numbers found.");
        } else {
            console.log(`⚠️ Found ${sortedGroups.length} duplicate groups:\n`);
            
            sortedGroups.forEach(([last4, group]) => {
                duplicateCount++;
                console.log(`📞 [${last4}] - ${group.length} members`);
                
                // Sort by Active first (credits > 0)
                group.sort((a, b) => (b.credits > 0 ? 1 : 0) - (a.credits > 0 ? 1 : 0));

                group.forEach(m => {
                    const isActive = m.credits > 0 || m.credits === Infinity; // Simple active check
                    const statusIcon = isActive ? "✨" : "💤";
                    console.log(`   ${statusIcon} ${m.name} (${m.branch}) | Credits: ${m.credits} | End: ${m.endDate || 'N/A'}`);
                });
                console.log("");
            });
        }

    } catch (error) {
        console.error("❌ Error querying members:", error);
    }
}

findDuplicatePhoneMembers();
