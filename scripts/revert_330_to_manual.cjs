const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    console.log('='.repeat(70));
    console.log('  3/30 출석 복원: 수동출석 직후 상태로 되돌리기');
    console.log('='.repeat(70));

    // 수동출석 2건의 doc ID (오전 8:23 생성 - 유지 대상)
    const KEEP_MANUAL = new Set([
        '48r9y1Xxzg5XpZCLbAMV',  // 김상아ttc9기 아쉬탕가
        'Hu47IDalIUHlewAwpzU2',  // 김상아ttc9기 하타
    ]);

    // 3/30 전체 attendance 조회
    const attSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .get();

    const mar31_midnight_kst = new Date('2026-03-31T00:00:00+09:00').getTime();

    const toDelete = [];
    attSnap.forEach(doc => {
        const d = doc.data();
        if (d.deletedAt) return;
        if (KEEP_MANUAL.has(doc.id)) return; // 수동출석은 유지

        // doc ID에 "restored" 포함 → 삭제
        if (doc.id.includes('restored')) {
            toDelete.push({ docId: doc.id, memberName: d.memberName, memberId: d.memberId, className: d.className });
            return;
        }

        // createdAt이 3/31 이후인 기록 → 삭제
        if (d.createdAt && d.createdAt._seconds) {
            const createdMs = d.createdAt._seconds * 1000;
            if (createdMs >= mar31_midnight_kst) {
                toDelete.push({ docId: doc.id, memberName: d.memberName, memberId: d.memberId, className: d.className });
            }
        }
    });

    console.log(`\n🗑️  삭제 대상: ${toDelete.length}건`);

    // 회원별 크레딧 복원량 계산 (삭제되는 valid 출석 수 = 잘못 차감된 크레딧 수)
    const creditRestore = new Map();
    
    for (const rec of toDelete) {
        console.log(`  ❌ ${rec.memberName} | ${rec.className} | ${rec.docId}`);
        
        // attendance에서 삭제
        await tdb.collection('attendance').doc(rec.docId).delete();

        // practice_events에서도 삭제 (같은 docId)
        const peDoc = await tdb.collection('practice_events').doc(rec.docId).get();
        if (peDoc.exists) {
            await tdb.collection('practice_events').doc(rec.docId).delete();
        }

        // 크레딧 복원 카운트 (valid 출석만)
        if (rec.memberId) {
            creditRestore.set(rec.memberId, (creditRestore.get(rec.memberId) || 0) + 1);
        }
    }

    // 크레딧 복원
    console.log(`\n💰 크레딧 복원:`);
    for (const [memberId, count] of creditRestore.entries()) {
        const memberDoc = await tdb.collection('members').doc(memberId).get();
        if (memberDoc.exists) {
            const before = memberDoc.data().credits;
            const name = memberDoc.data().name;
            await tdb.collection('members').doc(memberId).update({
                credits: admin.firestore.FieldValue.increment(count)
            });
            console.log(`  ✅ ${name}: ${before} → ${before + count} (+${count})`);
        }
    }

    // 최종 확인
    console.log('\n📊 최종 상태 확인:');
    const finalSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .get();
    let validCount = 0;
    finalSnap.forEach(doc => {
        const d = doc.data();
        if (!d.deletedAt) validCount++;
    });
    console.log(`  3/30 유효 출석 기록: ${validCount}건`);

    console.log('\n✅ 복원 완료! 수동출석 직후 상태로 되돌렸습니다.');
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
