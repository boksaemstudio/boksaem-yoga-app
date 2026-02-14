
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
    readFileSync('./functions/service-account-key.json', 'utf-8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function runAudit() {
    console.log('--- [Daily Audit] 데이터 무결성 점검 ---');

    // 1. 중복 출석 체크 (같은 날짜, 같은 회원, 같은 수업)
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const attSnap = await db.collection('attendance').where('date', '==', today).get();
    const attMap = new Map();
    attSnap.docs.forEach(doc => {
        const d = doc.data();
        const key = `${d.memberId}-${d.className}`;
        if (attMap.has(key)) {
            console.log(`⚠️ 중복 출석 발견: ${d.memberName} (${d.className})`);
        } else {
            attMap.set(key, doc.id);
        }
    });

    // 2. 음수 크레딧 체크
    const negCreditsSnap = await db.collection('members').where('credits', '<', 0).get();
    if (!negCreditsSnap.empty) {
        console.log(`⚠️ 음수 크레딧 회원 발견 (${negCreditsSnap.size}명):`);
        negCreditsSnap.docs.forEach(doc => {
            console.log(`  - ${doc.data().name}: ${doc.data().credits}`);
        });
    } else {
        console.log('✅ 음수 크레딧 회원 없음');
    }

    // 3. 최신 에러 로그 체크 (최근 1시간)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const errorSnap = await db.collection('error_logs').where('timestamp', '>=', oneHourAgo).get();
    if (!errorSnap.empty) {
        console.log(`⚠️ 최근 1시간 에러 로그 발견: ${errorSnap.size}건`);
    } else {
        console.log('✅ 최근 에러 로그 없음');
    }

    // 4. 과다 FCM 토큰 체크
    const tokensSnap = await db.collection('fcm_tokens').get();
    const tokenCounts = {};
    tokensSnap.docs.forEach(doc => {
        const d = doc.data();
        const id = d.memberId || d.instructorName || 'unknown';
        tokenCounts[id] = (tokenCounts[id] || 0) + 1;
    });
    Object.entries(tokenCounts).forEach(([id, count]) => {
        if (count > 10) {
            console.log(`⚠️ 과다 FCM 토큰 발견: ${id} (${count}개)`);
        }
    });

    console.log('--- 점검 완료 ---');
    process.exit(0);
}

runAudit();
