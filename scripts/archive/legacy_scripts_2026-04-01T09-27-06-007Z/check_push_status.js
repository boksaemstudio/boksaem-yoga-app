const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'functions', 'service-account-key.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkAll() {
    console.log('=== 1. 강사 FCM 토큰 조회 ===');
    const instructorTokens = await db.collection('fcm_tokens')
        .where('role', '==', 'instructor')
        .get();
    
    if (instructorTokens.empty) {
        console.log('❌ 강사로 등록된 FCM 토큰이 0개입니다. 강사 앱에서 알림 허용을 해야 합니다.');
    } else {
        console.log(`✅ 강사 토큰 ${instructorTokens.size}개 발견:`);
        instructorTokens.forEach(doc => {
            const data = doc.data();
            console.log(`  - 강사명: ${data.instructorName || 'N/A'}, 토큰ID: ${doc.id.substring(0, 15)}..., 업데이트: ${data.updatedAt}, 플랫폼: ${data.platform || 'unknown'}`);
        });
    }

    console.log('\n=== 2. 전체 FCM 토큰 통계 ===');
    const allTokens = await db.collection('fcm_tokens').get();
    const stats = {};
    allTokens.forEach(doc => {
        const role = doc.data().role || 'unknown';
        stats[role] = (stats[role] || 0) + 1;
    });
    console.log(`  전체 토큰 수: ${allTokens.size}`);
    Object.entries(stats).forEach(([role, count]) => {
        console.log(`  - ${role}: ${count}개`);
    });

    console.log('\n=== 3. 오늘 출석 기록 ===');
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const todayAttendance = await db.collection('attendance')
        .where('date', '==', today)
        .get();
    
    console.log(`오늘(${today}) 출석 기록: ${todayAttendance.size}건`);
    todayAttendance.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.memberName || 'N/A'} | ${data.className || 'N/A'} | 강사: ${data.instructor || 'N/A'} | 시간: ${data.timestamp || 'N/A'}`);
    });

    console.log('\n=== 4. push_history 최근 5건 ===');
    const pushHistory = await db.collection('push_history')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
    
    if (pushHistory.empty) {
        console.log('❌ push_history 기록이 없습니다.');
    } else {
        pushHistory.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt?.toDate?.() || 'N/A';
            console.log(`  - [${data.type}] ${data.title} | 성공: ${data.successCount} | 실패: ${data.failureCount} | ${date}`);
        });
    }

    process.exit(0);
}

checkAll().catch(e => { console.error(e); process.exit(1); });
