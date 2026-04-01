const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    console.log('='.repeat(60));
    console.log('  박주원 회원 전체 데이터 조사');
    console.log('='.repeat(60));

    // 1. 멤버 정보 조회
    const membersSnap = await tdb.collection('members')
        .where('name', '==', '박주원').get();
    
    if (membersSnap.empty) {
        console.log('❌ 박주원 회원을 찾을 수 없습니다.');
        process.exit(0);
    }

    membersSnap.forEach(doc => {
        const d = doc.data();
        console.log(`\n👤 회원 정보:`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   이름: ${d.name}`);
        console.log(`   지점: ${d.branchId}`);
        console.log(`   상태: ${d.status || '없음'}`);
        console.log(`   수강권: ${d.membershipType || '없음'}`);
        console.log(`   잔여횟수: ${d.credits}`);
        console.log(`   시작일: ${d.startDate || d.regDate || '없음'}`);
        console.log(`   종료일: ${d.endDate || '없음'}`);
        console.log(`   deletedAt: ${d.deletedAt || '없음'}`);
    });

    const memberId = membersSnap.docs[0].id;

    // 2. 어제(3/30) attendance 기록 조회
    console.log('\n--- 3/30 attendance 컬렉션 ---');
    const attSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .where('memberId', '==', memberId)
        .get();

    console.log(`총 ${attSnap.size}건`);
    attSnap.forEach(doc => {
        const d = doc.data();
        console.log(`  doc.id: ${doc.id}`);
        console.log(`  전체 데이터:`, JSON.stringify(d, null, 2));
        console.log('  ---');
    });

    // 3. practice_events에서도 확인
    console.log('\n--- 3/30 practice_events 컬렉션 ---');
    const peSnap = await tdb.collection('practice_events')
        .where('date', '==', '2026-03-30')
        .where('memberId', '==', memberId)
        .get();
    
    console.log(`총 ${peSnap.size}건`);
    peSnap.forEach(doc => {
        const d = doc.data();
        console.log(`  doc.id: ${doc.id}`);
        console.log(`  전체 데이터:`, JSON.stringify(d, null, 2));
        console.log('  ---');
    });

    // 4. attendance_logs에서도 확인
    console.log('\n--- 3/30 attendance_logs (루트 컬렉션) ---');
    const logsSnap = await db.collection('attendance_logs')
        .where('memberId', '==', memberId)
        .get();
    
    let logCount = 0;
    logsSnap.forEach(doc => {
        const d = doc.data();
        const ts = d.timestamp || '';
        if (ts.startsWith('2026-03-30')) {
            logCount++;
            console.log(`  doc.id: ${doc.id}`);
            console.log(`  전체 데이터:`, JSON.stringify(d, null, 2));
            console.log('  ---');
        }
    });
    console.log(`3/30 관련 ${logCount}건`);

    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
