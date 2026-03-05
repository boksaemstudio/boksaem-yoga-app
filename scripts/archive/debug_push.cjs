const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const serviceAccount = require('./functions/service-account-key.json');
const fs = require('fs');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
const messaging = getMessaging();
const logLines = [];

function log(msg) {
    console.log(msg);
    logLines.push(msg);
}

async function debugPush() {
    log("=== Debugging Push for '원장' ===");
    
    // 1. Check recent attendance records for today
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    log(`\n1. Recent Attendance for Today (${today})`);
    const attSnap = await db.collection('attendance')
        .where('date', '==', today)
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();
        
    attSnap.forEach(doc => {
        const data = doc.data();
        const timeStr = new Date(data.timestamp).toLocaleTimeString('ko-KR', {timeZone: 'Asia/Seoul'});
        log(`   [${timeStr}] ${data.memberName} checked into "${data.className}" (Instructor: ${data.instructor}, Branch: ${data.branchName})`);
    });

    // 2. Check tokens for '원장'
    log(`\n2. FCM Tokens for instructorName == '원장'`);
    const tokenSnap = await db.collection('fcm_tokens')
        .where('role', '==', 'instructor')
        .where('instructorName', '==', '원장')
        .get();
        
    if (tokenSnap.empty) {
        log("   ❌ No tokens found for '원장' with role 'instructor'.");
        
        // Let's check if '원장' tokens exist with a different role
        const allTokens = await db.collection('fcm_tokens').where('instructorName', '==', '원장').get();
        if (!allTokens.empty) {
            log(`   ⚠️ Found ${allTokens.size} tokens with instructorName='원장' but different role(s):`);
            allTokens.forEach(doc => log(`      Role: ${doc.data().role}`));
        }
        
    } else {
        tokenSnap.forEach(doc => {
            const data = doc.data();
            log(`   ✅ Token found: ${doc.id.substring(0, 10)}... (UpdatedAt: ${data.updatedAt}, Platform: ${data.platform})`);
        });
        
        if (tokenSnap.docs.length > 0) {
            const testToken = tokenSnap.docs[0].data().token;
            log(`\n   Attempting to send a test push to the first token...`);
            try {
                await messaging.send({
                    token: testToken,
                    notification: {
                        title: "🛠️ 시스템 디버깅",
                        body: "'원장' 강사앱 푸시 알림 테스트입니다."
                    }
                });
                log(`   ✅ Test push sent successfully! The FCM token is valid.`);
            } catch (err) {
                log(`   ❌ Test push failed: ${err.message}`);
            }
        }
    }
    
    log("\n=== Debugging Complete ===");
    fs.writeFileSync('push_log.txt', logLines.join('\n'));
}

debugPush().catch(err => {
    fs.writeFileSync('push_log.txt', logLines.join('\n') + '\nERROR: ' + err.message + '\n' + err.stack);
});
