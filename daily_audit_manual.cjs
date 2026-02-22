const admin = require('firebase-admin');
const fs = require('fs');

if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();
const output = [];

async function log(msg) {
    console.log(msg);
    output.push(msg);
}

async function runAudit() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    await log(`\n=== Manual Daily Audit Report (${today}) ===\n`);

    try {
        // 1. Attendance Check
        await log('[1] Checking Today\'s Attendance...');
        const attSnap = await db.collection('attendance').where('date', '==', today).get();
        await log(`- Total records found today: ${attSnap.size}`);
        
        const counts = {};
        attSnap.forEach(doc => {
            const data = doc.data();
            const memberId = data.memberId;
            if (memberId) {
                counts[memberId] = (counts[memberId] || 0) + 1;
            }
        });
        
        const duplicates = Object.entries(counts).filter(([id, count]) => count > 1);
        if (duplicates.length > 0) {
            await log(`⚠️  Possible duplicates found: ${duplicates.length} members.`);
            for (const [id, count] of duplicates) {
                const doc = attSnap.docs.find(d => d.data().memberId === id);
                await log(`   - ${doc.data().memberName} (${id}): ${count} times`);
            }
        } else {
            await log('✅ No duplicates found today.');
        }

        // 2. Negative Credits
        await log('\n[2] Checking for Negative Credits...');
        const negSnap = await db.collection('members').where('credits', '<', 0).get();
        if (negSnap.size > 0) {
            await log(`⚠️  Negative credits found: ${negSnap.size} members.`);
            negSnap.forEach(doc => {
                await log(`   - ${doc.data().name} (${doc.id}): ${doc.data().credits}`);
            });
        } else {
            await log('✅ No negative credits found.');
        }

        // 3. Error Logs
        await log('\n[3] Checking Recent Error Logs (Last 24h)...');
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const errSnap = await db.collection('error_logs').where('timestamp', '>', oneDayAgo).get();
        const aiErrSnap = await db.collection('ai_error_logs').where('timestamp', '>', oneDayAgo).get();
        
        await log(`- Client Errors: ${errSnap.size}`);
        await log(`- AI Errors: ${aiErrSnap.size}`);
        
        if (errSnap.size > 0) {
            await log('⚠️  Recent Client Errors:');
            errSnap.forEach(doc => log(`   - [${doc.data().timestamp}] ${doc.data().message || doc.data().error}`));
        }
        if (aiErrSnap.size > 0) {
            await log('⚠️  Recent AI Errors:');
            aiErrSnap.forEach(doc => log(`   - [${doc.data().timestamp}] ${doc.data().context}: ${doc.data().error || doc.data().message}`));
        }

        // 4. FCM Tokens
        await log('\n[4] Checking FCM Token Distribution...');
        const tokensSnap = await db.collection('fcm_tokens').get();
        const tokenCounts = {};
        tokensSnap.forEach(doc => {
            const mid = doc.data().memberId || doc.data().uid || 'unknown';
            tokenCounts[mid] = (tokenCounts[mid] || 0) + 1;
        });
        const bloated = Object.entries(tokenCounts).filter(([id, count]) => count > 10);
        if (bloated.length > 0) {
            await log(`⚠️  Bloated tokens found: ${bloated.length} users with >10 tokens.`);
            for (const [id, count] of bloated) {
                await log(`   - ${id}: ${count} tokens`);
            }
        } else {
            await log('✅ FCM tokens look distributed well.');
        }

        await log('\n=== Audit Complete ===');
    } catch (err) {
        await log(`\n❌ ERROR DURING AUDIT: ${err.message}\n${err.stack}`);
    }

    fs.writeFileSync('manual_audit_results.txt', output.join('\n'));
    process.exit(0);
}

runAudit();
