/**
 * 비정상 date 필드를 가진 출석 레코드 2건 보정
 * - date: ISO → YYYY-MM-DD
 * - classTime: UTC 시간 → KST 시간
 */
const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';

async function fixRecords() {
    const docIds = [
        'KxW9HHf2eWl1OXzIpoAl',  // 류지선 - 하타 인텐시브
        'CkDglYW3ZxtEdbaIxcAX'   // 최재민 - 자율수련
    ];

    for (const docId of docIds) {
        const ref = db.collection('studios').doc(STUDIO_ID).collection('attendance').doc(docId);
        const snap = await ref.get();
        if (!snap.exists) {
            console.log(`⚠️ ${docId} 없음`);
            continue;
        }

        const data = snap.data();
        console.log(`\n수정 전: ${data.memberName}`);
        console.log(`  date: ${data.date}`);
        console.log(`  classTime: ${data.classTime}`);
        console.log(`  timestamp: ${data.timestamp}`);

        // ISO date → YYYY-MM-DD (KST 기준)
        const ts = new Date(data.timestamp);
        const kstDate = new Date(ts.getTime() + 9 * 60 * 60 * 1000);
        const fixedDate = kstDate.toISOString().split('T')[0];
        const fixedClassTime = `${String(kstDate.getUTCHours()).padStart(2, '0')}:${String(kstDate.getUTCMinutes()).padStart(2, '0')}`;

        console.log(`\n수정 후:`);
        console.log(`  date: ${fixedDate}`);
        console.log(`  classTime: ${fixedClassTime}`);

        await ref.update({
            date: fixedDate,
            classTime: fixedClassTime
        });

        console.log(`  ✅ 수정 완료`);
    }

    // 검증
    console.log('\n=== 검증 ===');
    const todaySnap = await db.collection('studios').doc(STUDIO_ID)
        .collection('attendance')
        .where('date', '==', '2026-03-22')
        .get();
    console.log(`date='2026-03-22' 쿼리: ${todaySnap.size}건 (29건이어야 정상)`);

    process.exit(0);
}

fixRecords().catch(err => {
    console.error(err);
    process.exit(1);
});
