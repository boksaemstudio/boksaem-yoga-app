const admin = require('firebase-admin');
let serviceAccount;
try {
    serviceAccount = require('../service-account-key.json');
} catch (e) {
    // If not found, rely on default creds
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
} catch (e) { /* ignore */ }

const db = admin.firestore();

async function checkPendingAttendance() {
    console.log("🔍 Checking 'pending_attendance' collection...\n");

    try {
        const snapshot = await db.collection('pending_attendance').get();
        
        if (snapshot.empty) {
            console.log("✅ No pending attendance records found (All synced or none created).");
        } else {
            console.log(`⚠️ Found ${snapshot.size} pending records:\n`);
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`📄 ID: ${doc.id}`);
                console.log(`   Member: ${data.memberName || 'Unknown'} (${data.memberId})`);
                console.log(`   Time: ${data.timestamp}`);
                console.log(`   Status: ${data.synced ? 'Synced' : 'Pending'}`);
                console.log("");
            });
        }

        // Also check recent attendance to see if they made it there
        console.log("\n🔍 Checking recent 'attendance' (last 10 mins)...\n");
        const now = new Date();
        const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000); // 10 mins ago
        
        // Convert to KST ISO string roughly for query if storing as string, 
        // but assuming timestamp matches existing format.
        // Actually the app uses string timestamps mostly. 
        // Let's just fetch last 5 sorted by timestamp desc.
        
        const attSnapshot = await db.collection('attendance')
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();

        attSnapshot.forEach(doc => {
             const data = doc.data();
             console.log(`✅ [Synced] ${data.memberName} at ${data.timestamp} (${data.instructor})`);
        });

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

checkPendingAttendance();
