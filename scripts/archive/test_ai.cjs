const admin = require('firebase-admin');
const serviceAccount = require('./functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkAI() {
    console.log("--- AI Quota Check ---");
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const quotaDoc = await db.collection('ai_quota').doc(today).get();
    
    if (quotaDoc.exists) {
        console.log(`Quota for ${today}:`, quotaDoc.data());
    } else {
        console.log(`No quota document found for ${today}.`);
    }

    console.log("\n--- Recent Logs with AI ---");
    // Check if any recent logs have AI flags (if we log them)
    // Actually, let's just check the last few check-in logs
    const logs = await db.collection('attendance').orderBy('timestamp', 'desc').limit(5).get();
    logs.forEach(doc => {
        const data = doc.data();
        console.log(`Log ${doc.id}: Member ${data.memberName}, Timestamp: ${data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp}`);
    });
}

checkAI().catch(console.error);
