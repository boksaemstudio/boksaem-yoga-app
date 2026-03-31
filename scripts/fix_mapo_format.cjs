const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    console.log('='.repeat(60));
    console.log('  마포 복구 기록 데이터 형식 수정');
    console.log('='.repeat(60));

    // 마포 스케줄 조회 (강사명 매핑용)
    const MAPO_CLASSES = {
        '18:40': { className: '인요가', instructor: '이선생님' },
        '19:50': { className: '하타', instructor: '이선생님' },
        '21:00': { className: '플라잉 (기초)', instructor: '이선생님' },
    };

    // 마포 daily_classes에서 정확한 강사명 가져오기
    const dcSnap = await tdb.collection('daily_classes').doc('mapo_2026-03-30').get();
    if (dcSnap.exists) {
        const classes = dcSnap.data().classes || [];
        classes.forEach(c => {
            if (MAPO_CLASSES[c.time]) {
                MAPO_CLASSES[c.time].instructor = c.instructor || '이선생님';
                MAPO_CLASSES[c.time].className = c.title || MAPO_CLASSES[c.time].className;
            }
        });
        console.log('마포 스케줄 확인:');
        Object.entries(MAPO_CLASSES).forEach(([t, c]) => {
            console.log(`  ${t} ${c.className} (${c.instructor})`);
        });
    } else {
        console.log('⚠️ mapo_2026-03-30 daily_classes 없음, 기본값 사용');
    }

    // 마포 restored_ 기록 수정
    const attSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .where('branchId', '==', 'mapo')
        .get();

    let fixCount = 0;
    const batch = db.batch();

    attSnap.forEach(doc => {
        const d = doc.data();
        if (!doc.id.startsWith('restored_')) return;

        // className에서 시간 추출 (예: "21:00 플라잉 (기초)" -> "21:00")
        const classNameRaw = d.className || '';
        const timeMatch = classNameRaw.match(/^(\d{2}:\d{2})\s+(.+)$/);
        
        let classTime = '';
        let className = classNameRaw;
        let instructor = d.instructor || '원장';

        if (timeMatch) {
            classTime = timeMatch[1];
            className = timeMatch[2];
        }

        // 매핑에서 정확한 강사명 가져오기
        if (classTime && MAPO_CLASSES[classTime]) {
            instructor = MAPO_CLASSES[classTime].instructor;
        }

        // timestamp 수정: Firestore Timestamp -> ISO string
        let isoTimestamp = d.timestamp;
        if (d.timestamp && typeof d.timestamp === 'object' && d.timestamp.toDate) {
            isoTimestamp = d.timestamp.toDate().toISOString();
        } else if (d.timestamp && d.timestamp._seconds) {
            isoTimestamp = new Date(d.timestamp._seconds * 1000).toISOString();
        }

        const updates = {
            className: className,
            classTime: classTime,
            instructor: instructor,
            timestamp: isoTimestamp,
        };

        console.log(`  ✏️ ${d.memberName} | ${classTime} ${className} | 강사: ${instructor} | ts: ${isoTimestamp}`);
        batch.update(tdb.collection('attendance').doc(doc.id), updates);
        fixCount++;
    });

    if (fixCount > 0) {
        await batch.commit();
        console.log(`\n✅ 마포 ${fixCount}건 수정 완료`);
    } else {
        console.log('\n수정 대상 없음');
    }

    // 광흥창도 확인 - NaN 있는지
    console.log('\n--- 광흥창 검증 ---');
    const gwSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .where('branchId', '==', 'gwangheungchang')
        .get();

    let gwIssues = 0;
    gwSnap.forEach(doc => {
        const d = doc.data();
        if (d.deletedAt) return;
        if (!doc.id.startsWith('gwang_restored_')) return;
        
        // timestamp 확인
        if (d.timestamp && typeof d.timestamp === 'object' && d.timestamp.toDate) {
            // Firestore Timestamp이면 문제
            gwIssues++;
            console.log(`  ⚠️ ${d.memberName} | timestamp이 Firestore Timestamp 형식`);
        }
    });
    if (gwIssues === 0) console.log('  ✅ 광흥창 기록 정상');

    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
