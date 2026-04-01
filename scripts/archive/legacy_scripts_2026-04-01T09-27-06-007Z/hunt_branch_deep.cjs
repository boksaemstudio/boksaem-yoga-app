const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tenantId = 'boksaem-yoga';
const tdb = db.collection('studios').doc(tenantId);

async function run() {
    console.log('='.repeat(70));
    console.log('  명확한 물증 수색: "김지수" 회원의 남은 찌꺼기 기록 스캔');
    console.log('='.repeat(70));

    const memberId = 'OlGW6eJYFMwRFP5wpGvH'; // 마포 김지수
    const mRef = tdb.collection('members').doc(memberId);
    const mSnap = await mRef.get();
    
    console.log('\n[1] 회원 문서(members) 메타데이터 리뷰');
    console.log(JSON.stringify(mSnap.data(), null, 2));

    console.log('\n[2] 회원의 하위 컬렉션(Subcollections) 조회');
    const subcols = await mRef.listCollections();
    if (subcols.length === 0) {
        console.log('  하위 컬렉션이 없습니다.');
    } else {
        for (const c of subcols) {
            console.log(`  -> 발견된 서브 컬렉션: ${c.id}`);
            const docs = await c.get();
            docs.forEach(d => console.log('    ' + JSON.stringify(d.data())));
        }
    }

    console.log('\n[3] 출석 이벤트(practice_events) 외에 memberId를 참조하는 모든 컬렉션 브루트포스');
    const allCols = await tdb.listCollections();
    for (const c of allCols) {
        if (c.id === 'practice_events' || c.id === 'members' || c.id === 'attendance') continue;
        try {
            const snap = await c.where('memberId', '==', memberId).get();
            if (!snap.empty) {
                console.log(`\n  ✅ 발견됨: [${c.id}] 컬렉션`);
                snap.forEach(d => console.log('    ' + JSON.stringify(d.data())));
            }
        } catch(e) { }
    }

    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
