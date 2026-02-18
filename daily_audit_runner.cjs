const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, 'functions/service-account-key.json');
if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    if (admin.apps.length === 0) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
} else {
    if (admin.apps.length === 0) admin.initializeApp();
}

const db = admin.firestore();

async function runAudit() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    console.log(`\n=== Daily Audit Report (${today}) ===\n`);

    // 1. Attendance Check
    console.log('[1] Checking Today\'s Attendance...');
    const attSnap = await db.collection('attendance').where('date', '==', today).get();
    const attRecords = attSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`- Total records: ${attRecords.length}`);

    const memberCounts = {};
    attRecords.forEach(r => {
        memberCounts[r.memberId] = (memberCounts[r.memberId] || 0) + 1;
    });
    const duplicates = Object.entries(memberCounts).filter(([id, count]) => count > 1);
    if (duplicates.length > 0) {
        console.log(`⚠️  Possible duplicates: ${duplicates.length} members involved.`);
        for (const [id, count] of duplicates) {
            const m = attRecords.find(r => r.memberId === id);
            console.log(`   - ${m.memberName} (${id}): ${count} times`);
        }
    } else {
        console.log('✅ No duplicates found today.');
    }

    // 2. Negative Credits Check
    console.log('\n[2] Checking for Negative Credits...');
    const negSnap = await db.collection('members').where('credits', '<', 0).get();
    if (!negSnap.empty) {
        console.log(`⚠️  Negative credits found: ${negSnap.size} members.`);
        negSnap.forEach(d => console.log(`   - ${d.data().name}: ${d.data().credits}`));
    } else {
        console.log('✅ No negative credits found.');
    }

    // 3. Error Logs Check (Last 24h)
    console.log('\n[3] Checking Recent Error Logs...');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const errSnap = await db.collection('error_logs').where('timestamp', '>', oneDayAgo).get();
    const aiErrSnap = await db.collection('ai_error_logs').where('timestamp', '>', oneDayAgo).get();
    
    if (errSnap.size > 0) {
        console.log(`⚠️  Client Errors found: ${errSnap.size}`);
    } else {
        console.log('✅ No recent client errors.');
    }
    
    if (aiErrSnap.size > 0) {
        console.log(`⚠️  AI Errors found: ${aiErrSnap.size}`);
    } else {
        console.log('✅ No recent AI errors.');
    }

    // 4. FCM Tokens Check
    console.log('\n[4] Checking FCM Token Counts...');
    const tokenSnap = await db.collection('fcm_tokens').get();
    const userTokenCounts = {};
    tokenSnap.forEach(d => {
        const mid = d.data().memberId || d.data().instructorName || 'unknown';
        userTokenCounts[mid] = (userTokenCounts[mid] || 0) + 1;
    });
    const bloated = Object.entries(userTokenCounts).filter(([id, count]) => count > 10);
    if (bloated.length > 0) {
        console.log(`⚠️  Bloated tokens found: ${bloated.length} users with >10 tokens.`);
        for (const [id, count] of bloated) {
            console.log(`   - ${id}: ${count} tokens`);
        }
    } else {
        console.log('✅ FCM token distribution looks good.');
    }

    console.log('\n=== Audit Complete ===');
}

runAudit().catch(console.error);
