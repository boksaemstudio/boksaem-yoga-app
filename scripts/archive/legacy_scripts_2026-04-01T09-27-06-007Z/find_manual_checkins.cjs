const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    console.log('='.repeat(60));
    console.log('  3/30 광흥창 수동출석 후보 탐색 (정각 시간 기록)');
    console.log('='.repeat(60));

    // 광흥창 수업 시작 시간 (KST)
    const CLASS_TIMES_KST = ['10:00', '13:30', '19:00', '20:20'];

    const attSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .where('branchId', '==', 'gwangheungchang')
        .get();

    console.log('\n🔍 수업 시작시간과 정확히 일치하는 출석 기록:');
    console.log('(수동출석은 수업시작시간으로 기록됨)\n');

    const manualCandidates = [];

    attSnap.forEach(doc => {
        const d = doc.data();
        if (d.deletedAt) return;

        let ts = d.timestamp;
        if (!ts) return;

        // Firestore Timestamp 변환
        if (typeof ts === 'object' && ts.toDate) ts = ts.toDate().toISOString();
        if (typeof ts === 'object' && ts._seconds) ts = new Date(ts._seconds * 1000).toISOString();

        const date = new Date(ts);
        const kstH = (date.getUTCHours() + 9) % 24;
        const kstM = date.getUTCMinutes();
        const kstS = date.getUTCSeconds();
        const kstMs = date.getUTCMilliseconds();
        const kstTimeStr = `${String(kstH).padStart(2,'0')}:${String(kstM).padStart(2,'0')}`;

        // 정확히 수업 시작시간이고 초/밀리초가 0인 경우 (수동출석 특징)
        const isExactClassTime = CLASS_TIMES_KST.includes(kstTimeStr) && kstS === 0 && kstMs === 0;
        // 또는 정확히 수업 시작시간 (초는 있을 수 있음)
        const isClassTimeApprox = CLASS_TIMES_KST.includes(kstTimeStr);

        if (isClassTimeApprox) {
            const marker = isExactClassTime ? '🎯 정확히 정각!' : '⏰ 수업시간 일치';
            manualCandidates.push({
                name: d.memberName,
                time: kstTimeStr,
                seconds: kstS,
                className: d.className,
                docId: doc.id,
                isExact: isExactClassTime,
                method: d.method || '없음',
                isManual: d.isManual || false,
            });
            console.log(`  ${marker} ${d.memberName} | ${kstTimeStr}:${String(kstS).padStart(2,'0')}.${kstMs} | ${d.className} | method: ${d.method || '없음'} | isManual: ${d.isManual || false} | docId: ${doc.id}`);
        }
    });

    // 또한 activity_log 확인 (수동 출석 로그)
    console.log('\n--- activity_log에서 수동출석 기록 확인 ---');
    try {
        const logSnap = await tdb.collection('activity_log')
            .where('date', '==', '2026-03-30')
            .get();
        
        let manualLogs = 0;
        logSnap.forEach(doc => {
            const d = doc.data();
            if (d.action === 'manual_checkin' || d.type === 'manual' || (d.description && d.description.includes('수동'))) {
                manualLogs++;
                console.log(`  📝 ${JSON.stringify(d)}`);
            }
        });
        if (manualLogs === 0) console.log('  activity_log에 수동출석 기록 없음');
    } catch(e) { console.log('  activity_log 조회 실패:', e.message); }

    // system_logs에서도 확인
    console.log('\n--- system_logs 확인 ---');
    try {
        const sysSnap = await tdb.collection('system_logs')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        let found = 0;
        sysSnap.forEach(doc => {
            const d = doc.data();
            const msg = d.message || d.action || '';
            if (msg.includes('수동') || msg.includes('manual') || msg.includes('Manual')) {
                found++;
                let ts = d.createdAt;
                if (ts && ts.toDate) ts = ts.toDate().toLocaleString('ko-KR', {timeZone:'Asia/Seoul'});
                console.log(`  📝 [${ts}] ${msg}`);
            }
        });
        if (found === 0) console.log('  system_logs에 수동출석 관련 없음');
    } catch(e) { console.log('  system_logs 조회 실패:', e.message); }

    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
