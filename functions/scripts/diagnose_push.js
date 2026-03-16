const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'service-account-key.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';
const tdb = (col) => db.collection(`studios/${STUDIO_ID}/${col}`);

async function diagnose() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    console.log('=== 출석 푸시 진단 ===');
    console.log(`날짜: ${today}\n`);

    // 1. 오늘 광흥창 출석 기록 확인
    console.log('=== 1. 오늘 광흥창 출석 기록 ===');
    const attSnap = await tdb('attendance')
        .where('date', '==', today)
        .where('branchId', '==', 'gwangheungchang')
        .get();
    
    if (attSnap.empty) {
        console.log('❌ 오늘 광흥창 출석 기록 없음');
    } else {
        console.log(`✅ ${attSnap.size}건 발견:`);
        attSnap.forEach(doc => {
            const d = doc.data();
            console.log(`  - ${d.memberName} | 수업: ${d.className} | 강사: "${d.instructor}" | 시간: ${d.classTime || d.timestamp} | 상태: ${d.status}`);
        });
    }

    // 2. 강사 FCM 토큰 확인 (테넌트 경로)
    console.log('\n=== 2. 강사 FCM 토큰 (테넌트 경로) ===');
    const tokenSnap = await tdb('fcm_tokens')
        .where('role', '==', 'instructor')
        .get();
    
    if (tokenSnap.empty) {
        console.log('❌ 테넌트 경로에 강사 토큰 없음!');
    } else {
        console.log(`✅ ${tokenSnap.size}개 강사 토큰:`);
        const seen = new Set();
        tokenSnap.forEach(doc => {
            const d = doc.data();
            const key = `${d.instructorName}-${doc.id.substring(0, 8)}`;
            if (!seen.has(key)) {
                seen.add(key);
                console.log(`  - 강사명: "${d.instructorName}" | 토큰: ${doc.id.substring(0, 12)}... | 업데이트: ${d.updatedAt}`);
            }
        });
    }

    // 3. 오늘 시간표에서 10시 수업 강사명 확인
    console.log(`\n=== 3. 오늘(${today}) 광흥창 시간표 ===`);
    const schedId = `gwangheungchang_${today}`;
    const schedDoc = await tdb('daily_classes').doc(schedId).get();
    if (schedDoc.exists) {
        const classes = schedDoc.data().classes || [];
        classes.forEach(c => {
            console.log(`  - ${c.time} | "${c.title || c.className}" | 강사: "${c.instructor}" | 상태: ${c.status || 'active'}`);
        });
    } else {
        console.log('❌ 시간표 문서 없음');
    }

    // 4. push_history에서 최근 attendance 관련 기록 확인 (테넌트)
    console.log('\n=== 4. push_history 최근 10건 (테넌트) ===');
    const pushSnap = await tdb('push_history')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
    
    if (pushSnap.empty) {
        console.log('❌ push_history 비어있음');
    } else {
        pushSnap.forEach(doc => {
            const d = doc.data();
            const date = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : 'N/A';
            console.log(`  - [${d.type}] ${d.title || 'N/A'} | 성공:${d.successCount} 실패:${d.failureCount} | ${date}`);
        });
    }

    // 5. 루트 경로 vs 테넌트 경로 비교
    console.log('\n=== 5. 경로 비교 ===');
    const rootAtt = await db.collection('attendance').where('date', '==', today).limit(5).get();
    const tenantAtt = await tdb('attendance').where('date', '==', today).limit(5).get();
    console.log(`루트 attendance 오늘: ${rootAtt.size}건`);
    console.log(`테넌트 attendance 오늘: ${tenantAtt.size}건`);
    
    const rootTokens = await db.collection('fcm_tokens').where('role', '==', 'instructor').get();
    const tenantTokens = await tdb('fcm_tokens').where('role', '==', 'instructor').get();
    console.log(`루트 강사 토큰: ${rootTokens.size}개`);
    console.log(`테넌트 강사 토큰: ${tenantTokens.size}개`);

    process.exit(0);
}

diagnose().catch(e => { console.error(e); process.exit(1); });
