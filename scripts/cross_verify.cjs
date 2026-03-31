const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

// 이전 대화 final_recovery_list.md 기준 복구 대상 명단
const EXPECTED_MAPO = [
    { name: '이희원', class: '인요가' },
    { name: '이비비안', class: '인요가' },
    { name: '안정은', class: '인요가' },
    { name: '조연빈', class: '인요가' },
    { name: '김은숙', class: '인요가' },
    { name: '조주영', class: '하타' },
    { name: '오혜경', class: '하타' },
    { name: '박지혜', class: '하타' },
    { name: '김민지', class: '하타' },
    { name: '차선영', class: '하타' },
    { name: '장서윤', class: '플라잉 (기초)' },
    { name: '김민지', class: '플라잉 (기초)' },  // 연강
    { name: '안혜인', class: '플라잉 (기초)' },
    { name: '조주영', class: '플라잉 (기초)' },  // 연강
    { name: '최진주', class: '플라잉 (기초)' },
    { name: '최민경', class: '플라잉 (기초)' },
    { name: '표현서', class: '플라잉 (기초)' },
];

const EXPECTED_GWANG = [
    // 주민정 - 원장님 지시로 제외
    // 박주원 - 종료회원으로 제외
    { name: '윤지혜ttc9기', class: '하타' },
    { name: '이동건', class: '하타' },
    { name: '정수지', class: '하타' },
    { name: '하정은', class: '하타' },
    { name: '김여정', class: '하타' },
    { name: '곽혜빈ttc8기', class: '하타' },
    { name: '오혜실ttc7기', class: '하타' },
    { name: '손채영', class: '하타' },
    { name: '서인덕', class: '하타' },
    { name: '박혜연', class: '하타' },
    { name: '김진옥', class: '하타' },
    { name: '김상아ttc9기', class: '하타' },
    { name: '황지연', class: '하타' },
    { name: '이다진', class: '하타' },
    { name: '김상아ttc9기', class: '아쉬탕가' },  // 연강
    { name: '조수형', class: '아쉬탕가' },
    { name: '정연희', class: '아쉬탕가' },
    { name: '정희정', class: '아쉬탕가' },
    { name: '차유리', class: '아쉬탕가' },
    { name: '이제인ttc9기', class: '아쉬탕가' },
    { name: '최규화', class: '아쉬탕가' },
    { name: '김지수', class: '아쉬탕가' },
    { name: '하은진', class: '아쉬탕가' },
];

async function run() {
    console.log('='.repeat(60));
    console.log('  이전 대화 복구 명단 vs 현재 DB 교차 검증');
    console.log('='.repeat(60));

    const attSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .get();

    // 현재 복구 기록만 (restored_ 또는 gwang_restored_)
    const currentRestored = { mapo: [], gwang: [] };
    // 원래 기록 (김상아 수동출석 포함)
    const currentOriginal = [];

    attSnap.forEach(doc => {
        const d = doc.data();
        if (d.deletedAt) return;
        
        if (doc.id.startsWith('restored_')) {
            currentRestored.mapo.push({ name: d.memberName, class: d.className, docId: doc.id });
        } else if (doc.id.startsWith('gwang_restored_')) {
            currentRestored.gwang.push({ name: d.memberName, class: d.className, docId: doc.id });
        } else {
            currentOriginal.push({ name: d.memberName, class: d.className, docId: doc.id, branch: d.branchId });
        }
    });

    // 마포 비교
    console.log('\n📍 마포점 복구 검증:');
    console.log(`  예상: ${EXPECTED_MAPO.length}건 | 현재: ${currentRestored.mapo.length}건`);

    const mapoMissing = [];
    const mapoExtra = [];

    for (const exp of EXPECTED_MAPO) {
        const found = currentRestored.mapo.find(r => r.name === exp.name && r.class.includes(exp.class.split(' ')[0]));
        if (found) {
            console.log(`  ✅ ${exp.name} | ${exp.class}`);
        } else {
            mapoMissing.push(exp);
            console.log(`  ❌ 누락: ${exp.name} | ${exp.class}`);
        }
    }

    // 광흥창 비교
    console.log('\n📍 광흥창점 복구 검증:');
    console.log(`  예상: ${EXPECTED_GWANG.length}건 | 현재: ${currentRestored.gwang.length}건`);

    // 김상아는 수동출석(Hu47, 48r9)으로 들어갔으므로 gwang_restored에 없을 수 있음
    for (const exp of EXPECTED_GWANG) {
        const foundRestored = currentRestored.gwang.find(r => r.name === exp.name && r.class.includes(exp.class.split(' ')[0]));
        const foundOriginal = currentOriginal.find(r => r.name === exp.name && r.class.includes(exp.class.split(' ')[0]) && r.branch === 'gwangheungchang');
        
        if (foundRestored) {
            console.log(`  ✅ ${exp.name} | ${exp.class} (복구)`);
        } else if (foundOriginal) {
            console.log(`  ✅ ${exp.name} | ${exp.class} (수동/원래)`);
        } else {
            console.log(`  ❌ 누락: ${exp.name} | ${exp.class}`);
        }
    }

    // 원래 기록 요약
    console.log(`\n📊 원래 기록 (수동출석/당일출석): ${currentOriginal.length}건`);
    const origGw = currentOriginal.filter(r => r.branch === 'gwangheungchang');
    const origMp = currentOriginal.filter(r => r.branch === 'mapo');
    console.log(`  광흥창: ${origGw.length}건 | 마포: ${origMp.length}건`);

    console.log(`\n📊 전체 합계:`);
    console.log(`  원래: ${currentOriginal.length} + 마포복구: ${currentRestored.mapo.length} + 광흥창복구: ${currentRestored.gwang.length} = 총 ${currentOriginal.length + currentRestored.mapo.length + currentRestored.gwang.length}건`);

    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
