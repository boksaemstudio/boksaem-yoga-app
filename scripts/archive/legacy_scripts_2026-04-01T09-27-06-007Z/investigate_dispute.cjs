const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tenantId = 'boksaem-yoga';
const tdb = db.collection('studios').doc(tenantId);

async function run() {
    console.log('='.repeat(70));
    console.log('  심층 분석: 모든 로그 컬렉션에서 "김지수" 및 야간 출석 이력 추적');
    console.log('='.repeat(70));

    // 1. 모든 알려진 로깅 컬렉션 검색
    const collectionsToCheck = ['kiosk_logs', 'app_logs', 'attendance_logs', 'admin_audits', 'push_history'];
    for (const colName of collectionsToCheck) {
        try {
            const snap = await tdb.collection(colName).limit(1).get();
            if (!snap.empty) {
                console.log(`\n[🔍 컬렉션 발견: ${colName}]`);
                // 오늘 날짜 데이터 검색
                const logSnap = await tdb.collection(colName)
                    .orderBy('timestamp', 'desc')
                    .limit(500)
                    .get();
                
                let found = 0;
                logSnap.forEach(d => {
                    const data = d.data();
                    const str = JSON.stringify(data);
                    if (str.includes('김지수') || str.includes('20:14')) {
                        console.log(`    MATCH -> ID:${d.id} | Data: ${str.substring(0, 150)}...`);
                        found++;
                    }
                });
                console.log(`    발견된 연관 로그: ${found}건`);
            }
        } catch(e) { /* index missing etc */ }
    }

    // 2. 김지수 회원의 practice_events 상세조회
    console.log('\n[🔍 practice_events 상세분석: 김지수]');
    const jisooMemberDocs = await tdb.collection('members').where('name', '==', '김지수').get();
    
    for (let md of jisooMemberDocs.docs) {
        console.log(`  회원 ID: ${md.id} | 지점: ${md.data().branchId}`);
        const evSnap = await tdb.collection('practice_events')
            .where('memberId', '==', md.id)
            .get();
        evSnap.forEach(ed => {
            const ev = ed.data();
            let cTime = 'N/A';
            if (ev.createdAt && ev.createdAt.toDate) cTime = ev.createdAt.toDate().toLocaleString('ko-KR', {timeZone:'Asia/Seoul', hour12:false});
            console.log(`    EventID: ${ed.id} | Date: ${ev.date} | Time: ${cTime} | Type: ${ev.eventType}`);
        });
        
        // 3. 현재 출석테이블에 김지수가 있는지 확인
        const attSnap = await tdb.collection('attendance')
            .where('memberId', '==', md.id)
            .where('date', '==', '2026-03-30')
            .get();
        if (!attSnap.empty) {
            console.log(`    ⚠️ 경고: 김지수는 이미 3/30 현존 출석 기록이 있습니다!`);
            attSnap.forEach(ad => {
                const a = ad.data();
                let tTime = 'N/A';
                if (a.timestamp && a.timestamp.toDate) tTime = a.timestamp.toDate().toLocaleString('ko-KR', {timeZone:'Asia/Seoul', hour12:false});
                console.log(`      -> AttID: ${ad.id} | Class: ${a.className} | Time: ${tTime} | Status: ${a.status}`);
            });
        } else {
            console.log(`    (현존 3/30 출석 기록 없음 - 완전 삭제됨)`);
        }
    }

    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
