const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tenantId = 'boksaem-yoga';
const tdb = db.collection('studios').doc(tenantId);

async function run() {
    console.log('='.repeat(70));
    console.log('  출석 지점(Branch) 단서 추적');
    console.log('='.repeat(70));

    // practice_events 원본 문서를 덤프해서 숨겨진 필드가 있는지 확인
    const evSnap = await tdb.collection('practice_events')
        .where('memberId', '==', 'OlGW6eJYFMwRFP5wpGvH') // 마포 김지수
        .where('date', '==', '2026-03-30')
        .get();

    evSnap.forEach(doc => {
        console.log(`\n[🔍 김지수 회원의 practice_event 원본 문서 데이터]`);
        console.log(JSON.stringify(doc.data(), null, 2));
    });

    // 앱 로그(app_logs)가 해당 시간에 존재하는지 확인 (키오스크, 강사앱 등)
    console.log(`\n[🔍 20:10 ~ 20:20 시간대의 다른 관련 로그 확인 (app_logs)]`);
    try {
        const query = await tdb.collection('app_logs')
            .where('timestamp', '>=', '2026-03-30T11:00:00.000Z') // UTC 11:00 = KST 20:00
            .where('timestamp', '<=', '2026-03-30T11:30:00.000Z') // KST 20:30
            .get();
        
        let found = 0;
        query.forEach(doc => {
            const d = doc.data();
            console.log(`  -> [${d.level}] ${d.timestamp} | path=${d.path} | uid=${d.uid} | msg=${d.message}`);
            found++;
        });
        if (found === 0) console.log('  -> 관련 app_logs 없음');
    } catch(e) {
        console.log('  -> app_logs 컬렉션 조회 실패 (혹은 없음)');
    }

    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
