const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'service-account-key.json'));

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
        console.log('❌ 강사로 등록된 FCM 토큰이 0개입니다.');
    } else {
        console.log('✅ 강사 토큰 ' + instructorTokens.size + '개 발견:');
        instructorTokens.forEach(function(doc) {
            var data = doc.data();
            console.log('  - 강사명:', data.instructorName || 'N/A', '| 토큰ID:', doc.id.substring(0, 12) + '...', '| 업데이트:', data.updatedAt, '| 플랫폼:', data.platform || 'unknown');
        });
    }

    console.log('\n=== 2. 전체 FCM 토큰 통계 ===');
    var allTokens = await db.collection('fcm_tokens').get();
    var stats = {};
    allTokens.forEach(function(doc) {
        var role = doc.data().role || 'unknown';
        stats[role] = (stats[role] || 0) + 1;
    });
    console.log('총 토큰 수:', allTokens.size);
    for (var role in stats) {
        console.log('  -', role, ':', stats[role], '개');
    }

    console.log('\n=== 3. 오늘 출석 기록 ===');
    var today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    var todayAttendance = await db.collection('attendance')
        .where('date', '==', today)
        .get();
    
    console.log('오늘(' + today + ') 출석 기록:', todayAttendance.size + '건');
    todayAttendance.forEach(function(doc) {
        var data = doc.data();
        console.log('  -', data.memberName || 'N/A', '|', data.className || 'N/A', '| 강사:', data.instructor || 'N/A', '| 시간:', data.timestamp || 'N/A');
    });

    console.log('\n=== 4. push_history 최근 5건 ===');
    var pushHistory = await db.collection('push_history')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
    
    if (pushHistory.empty) {
        console.log('❌ push_history 기록이 없습니다.');
    } else {
        pushHistory.forEach(function(doc) {
            var data = doc.data();
            var date = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : 'N/A';
            console.log('  - [' + data.type + ']', data.title, '| 성공:', data.successCount, '| 실패:', data.failureCount, '|', date);
        });
    }

    process.exit(0);
}

checkAll().catch(function(e) { console.error(e); process.exit(1); });
