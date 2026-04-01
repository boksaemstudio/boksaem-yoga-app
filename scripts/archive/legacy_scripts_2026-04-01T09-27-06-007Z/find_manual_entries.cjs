const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    console.log('='.repeat(60));
    console.log('  3/30 출석 중 오늘(3/31) 생성된 모든 기록 - 시간순 정렬');
    console.log('='.repeat(60));

    const attSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .get();

    const mar31_midnight = new Date('2026-03-31T00:00:00+09:00').getTime();
    const records = [];

    attSnap.forEach(doc => {
        const d = doc.data();
        if (d.deletedAt) return;

        let createdMs = null;
        if (d.createdAt && d.createdAt._seconds) {
            createdMs = d.createdAt._seconds * 1000;
        } else if (d.createdAt && typeof d.createdAt.toDate === 'function') {
            createdMs = d.createdAt.toDate().getTime();
        }

        if (createdMs && createdMs >= mar31_midnight) {
            records.push({
                docId: doc.id,
                memberName: d.memberName || '알수없음',
                memberId: d.memberId,
                className: d.className || '',
                method: d.method || '없음',
                isManual: d.isManual || false,
                status: d.status || '',
                branchId: d.branchId || '',
                createdMs,
                createdStr: new Date(createdMs).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
            });
        }
    });

    // 시간순 정렬
    records.sort((a, b) => a.createdMs - b.createdMs);

    console.log(`\n오늘(3/31) 생성된 3/30 출석 기록: 총 ${records.length}건\n`);

    let lastHour = -1;
    records.forEach((r, i) => {
        const h = new Date(r.createdMs).getUTCHours();
        const kstH = (h + 9) % 24;
        if (kstH !== lastHour) {
            console.log(`\n--- ${kstH}시대 ---`);
            lastHour = kstH;
        }
        console.log(`  ${i+1}. [${r.createdStr}] ${r.memberName} | ${r.className} | ${r.branchId} | method: ${r.method} | isManual: ${r.isManual} | docId: ${r.docId}`);
    });

    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
