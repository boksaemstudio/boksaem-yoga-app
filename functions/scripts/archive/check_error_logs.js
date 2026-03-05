/**
 * Check recent error logs to find sync issues
 */
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    const serviceAccount = require('../service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkErrors() {
    console.log('--- [Recent Error Logs] ---');
    const logsSnap = await db.collection('error_logs')
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();
    
    logsSnap.forEach(doc => {
        const d = doc.data();
        console.log(`[${d.timestamp}] ${d.context || 'Unknown'}: ${d.message}`);
        if (d.stack) console.log(`  Stack: ${d.stack.split('\n')[0]}`);
    });

    console.log('\n--- [AI Error Logs] ---');
    const aiLogsSnap = await db.collection('ai_error_logs')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
    
    aiLogsSnap.forEach(doc => {
        const d = doc.data();
        console.log(`[${d.timestamp?.toDate ? d.timestamp.toDate().toISOString() : d.timestamp}] ${d.type}: ${d.message}`);
    });
}

checkErrors().catch(console.error);
