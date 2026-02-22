const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Load service account from environment or file
// [ADMIN] For safety, assuming the agent has access to a service account file or the env is set up
// Since I can't use service accounts easily, I'll use the existing .env if possible, 
// but wait, I can just use the 'check_today_attendance.cjs' pattern if it worked before.
// Actually, I'll use a simpler approach: list recent logs in a file I can read.

async function diagnose() {
    console.log("Starting diagnostic...");
    // [FIX] Using the correct key path found in the project
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
        const keyPath = path.join(process.cwd(), 'functions', 'service-account-key.json');
        if (fs.existsSync(keyPath)) {
            admin.initializeApp({ credential: admin.credential.cert(keyPath) });
        } else {
            console.error("Service account key not found at", keyPath);
            return;
        }
    }
    const db = admin.firestore();
    
    console.log("Fetching recent attendance logs (last 5)...");
    const snapshot = await db.collection('attendance').orderBy('timestamp', 'desc').limit(5).get();
    
    const logs = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        logs.push({
            id: doc.id,
            timestamp_type: typeof data.timestamp,
            timestamp_val: data.timestamp,
            date: data.date,
            status: data.status,
            type: data.type,
            memberId: data.memberId
        });
    });
    
    console.log("Log Data Structure:", JSON.stringify(logs, null, 2));
    
    if (logs.length > 0 && logs[0].memberId) {
        console.log(`Fetching member data for ${logs[0].memberId}...`);
        const memberDoc = await db.collection('members').doc(logs[0].memberId).get();
        if (memberDoc.exists()) {
            console.log("Member Data:", JSON.stringify(memberDoc.data(), null, 2));
        }
    }
}

diagnose().catch(console.error);
