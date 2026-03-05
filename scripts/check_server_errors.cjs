const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkDetailedLogs() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    console.log(`--- Checking logs since ${oneDayAgo.toISOString()} ---\n`);

    // 1. 일반 에러 로그 (error_logs)
    console.log('>>> [error_logs]');
    const errorSnap = await db.collection('error_logs')
        .where('timestamp', '>=', oneDayAgo.toISOString())
        .orderBy('timestamp', 'desc')
        .get();

    if (errorSnap.empty) {
        console.log('No general error logs found in the last 24h.');
    } else {
        errorSnap.forEach(doc => {
            const data = doc.data();
            console.log(`[${data.timestamp}] ${data.message || data.error}`);
            if (data.context) console.log(`   Context: ${JSON.stringify(data.context)}`);
            if (data.stack) console.log(`   Stack: ${data.stack.split('\n')[0]}...`);
        });
    }

    // 2. AI 에러 로그 (ai_error_logs)
    console.log('\n>>> [ai_error_logs]');
    // ai_error_logs는 Firestore Timestamp를 사용할 가능성이 있으므로 두 가지 방식으로 체크
    let aiErrorSnap = await db.collection('ai_error_logs')
        .where('timestamp', '>=', oneDayAgo)
        .orderBy('timestamp', 'desc')
        .get();

    if (aiErrorSnap.empty) {
        // 문자열 기반 타임스탬프 체크 (fallback)
        aiErrorSnap = await db.collection('ai_error_logs')
            .where('timestamp', '>=', oneDayAgo.toISOString())
            .orderBy('timestamp', 'desc')
            .get();
    }

    if (aiErrorSnap.empty) {
        console.log('No AI error logs found in the last 24h.');
    } else {
        aiErrorSnap.forEach(doc => {
            const data = doc.data();
            const ts = data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp;
            console.log(`[${ts}] ${data.error || data.message}`);
            if (data.type) console.log(`   Type: ${data.type}`);
        });
    }
}

checkDetailedLogs().catch(console.error);
