/**
 * Daily Audit Script for Boksaem Yoga App
 * Checks for data integrity, AI usage, and FCM token health.
 */
const admin = require('firebase-admin');
const path = require('path');

if (admin.apps.length === 0) {
    const serviceAccount = require('../service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function runAudit() {
    console.log('--- [Daily Audit Report] ---');
    console.log(`Time: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
    
    const results = {
        negativeCredits: [],
        duplicateAttendance: [],
        aiUsage: {},
        recentErrors: [],
        fcmTokenHealth: { total: 0, excessiveMembers: [] }
    };

    // 1. Negative Credits
    console.log('\n[1] Checking negative credits...');
    const negCreditsSnap = await db.collection('members').where('credits', '<', 0).get();
    negCreditsSnap.forEach(doc => {
        results.negativeCredits.push({ id: doc.id, name: doc.data().name, credits: doc.data().credits });
    });
    console.log(`  Found: ${results.negativeCredits.length} members`);

    // 2. Duplicate Attendance (Today)
    console.log('\n[2] Checking today\'s duplicate attendance...');
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const attSnap = await db.collection('attendance').where('date', '==', today).get();
    const attMap = {}; // memberId -> [logs]
    attSnap.forEach(doc => {
        const data = doc.data();
        if (!attMap[data.memberId]) attMap[data.memberId] = [];
        attMap[data.memberId].push({ id: doc.id, ...data });
    });

    for (const memberId in attMap) {
        const logs = attMap[memberId];
        if (logs.length > 1) {
            // Check for potential duplicates (same className within short time)
            logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            for (let i = 0; i < logs.length - 1; i++) {
                const a = logs[i];
                const b = logs[i+1];
                const diffMin = (new Date(b.timestamp) - new Date(a.timestamp)) / 60000;
                if (diffMin < 10 && a.className === b.className) {
                    results.duplicateAttendance.push({ memberName: a.memberName, className: a.className, diffMin: diffMin.toFixed(1) });
                }
            }
        }
    }
    console.log(`  Found: ${results.duplicateAttendance.length} potential duplicates`);

    // 3. AI Usage & Errors
    console.log('\n[3] Checking AI usage and errors...');
    const usageSnap = await db.collection('ai_usage').orderBy('date', 'desc').limit(1).get();
    if (!usageSnap.empty) {
        results.aiUsage = usageSnap.docs[0].data();
    }

    const errSnap = await db.collection('error_logs').orderBy('timestamp', 'desc').limit(5).get();
    errSnap.forEach(doc => {
        results.recentErrors.push({ id: doc.id, message: doc.data().message, timestamp: doc.data().timestamp });
    });

    const aiErrSnap = await db.collection('ai_error_logs').orderBy('timestamp', 'desc').limit(5).get();
    aiErrSnap.forEach(doc => {
        results.recentErrors.push({ id: doc.id, type: 'AI', message: doc.data().message, timestamp: doc.data().timestamp });
    });

    // 4. FCM Tokens
    console.log('\n[4] Checking FCM token health...');
    const tokenSnap = await db.collection('fcm_tokens').get();
    results.fcmTokenHealth.total = tokenSnap.size;
    const memberTokens = {}; // memberId -> count
    tokenSnap.forEach(doc => {
        const mid = doc.data().memberId;
        if (mid) {
            memberTokens[mid] = (memberTokens[mid] || 0) + 1;
        }
    });
    for (const mid in memberTokens) {
        if (memberTokens[mid] > 10) {
            results.fcmTokenHealth.excessiveMembers.push({ memberId: mid, count: memberTokens[mid] });
        }
    }

    console.log('\n--- [Audit Summary] ---');
    console.log(JSON.stringify(results, null, 2));
}

runAudit().catch(console.error);
