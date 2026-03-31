const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    console.log('='.repeat(70));
    console.log('  3/30 출석 기록 전수 조사 - 생성 시간 기준 분류');
    console.log('='.repeat(70));

    const attSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .get();

    const records = [];
    attSnap.forEach(doc => {
        const d = doc.data();
        if (d.deletedAt) return; // soft-deleted 제외

        let createdAtMs = null;
        let createdAtStr = '알수없음';

        // createdAt 파싱
        if (d.createdAt && d.createdAt._seconds) {
            createdAtMs = d.createdAt._seconds * 1000;
            createdAtStr = new Date(createdAtMs).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
        } else if (d.timestamp) {
            createdAtMs = new Date(d.timestamp).getTime();
            createdAtStr = new Date(createdAtMs).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
        }

        records.push({
            docId: doc.id,
            memberName: d.memberName || '알수없음',
            memberId: d.memberId,
            className: d.className || '',
            status: d.status || '',
            method: d.method || '',
            isManual: d.isManual || false,
            timestamp: d.timestamp || '',
            createdAtMs,
            createdAtStr,
            branchId: d.branchId || '',
            isRestored: doc.id.includes('restored'),
        });
    });

    // 시간순 정렬
    records.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));

    // 카테고리 분류
    // 복구 스크립트 시간대: 대략 3/31 새벽 (이전 대화에서)
    // 수동 출석: 오늘 아침 9시 이전
    const mar31_midnight_kst = new Date('2026-03-31T00:00:00+09:00').getTime(); // 3/31 자정 KST
    const mar31_9am_kst = new Date('2026-03-31T09:00:00+09:00').getTime();

    console.log('\n📋 [A] 원래 출석 기록 (3/30 당일 생성)');
    console.log('-'.repeat(70));
    let originalCount = 0;
    records.forEach(r => {
        if (r.createdAtMs && r.createdAtMs < mar31_midnight_kst && !r.isRestored) {
            originalCount++;
            console.log(`  ${originalCount}. ${r.memberName} | ${r.className} | ${r.status} | ${r.branchId} | 생성: ${r.createdAtStr} | ID: ${r.docId}`);
        }
    });
    console.log(`  → 총 ${originalCount}건\n`);

    console.log('📋 [B] 3/31 새벽~아침 생성 기록 (복구 스크립트 또는 수동)');
    console.log('-'.repeat(70));
    let laterCount = 0;
    records.forEach(r => {
        if ((r.createdAtMs && r.createdAtMs >= mar31_midnight_kst) || r.isRestored) {
            laterCount++;
            const tag = r.isRestored ? '🔴 복구스크립트' : (r.isManual ? '🟡 수동출석' : (r.method === 'system_restore' ? '🔴 시스템복구' : '❓ 확인필요'));
            console.log(`  ${laterCount}. [${tag}] ${r.memberName} | ${r.className} | ${r.status} | method: ${r.method} | isManual: ${r.isManual} | 생성: ${r.createdAtStr} | ID: ${r.docId}`);
        }
    });
    console.log(`  → 총 ${laterCount}건\n`);

    // createdAt이 없는 기록
    console.log('📋 [C] 생성시간 불명 (timestamp만 있는 기록)');
    console.log('-'.repeat(70));
    let unknownCount = 0;
    records.forEach(r => {
        if (!r.createdAtMs) {
            unknownCount++;
            console.log(`  ${unknownCount}. ${r.memberName} | ${r.className} | timestamp: ${r.timestamp} | ID: ${r.docId}`);
        }
    });
    if (unknownCount === 0) console.log('  없음');
    console.log(`  → 총 ${unknownCount}건\n`);

    console.log(`전체 유효 기록: ${records.length}건 (원래: ${originalCount} + 후속: ${laterCount} + 불명: ${unknownCount})`);

    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
