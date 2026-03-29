/**
 * 박혜린 회원 upcomingMembership 수동 복구
 * 매출 기록(10회권 3개월 TBD)은 있는데 회원 문서에 upcomingMembership이 누락된 상태를 수정
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const acc = require('../functions/service-account-key.json');
try { initializeApp({ credential: cert(acc) }); } catch(e) {}
const db = getFirestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    const mSnap = await tdb.collection('members').where('phone', '==', '010-4633-0826').get();
    if (mSnap.empty) { console.log('회원 없음'); process.exit(1); }
    
    const doc = mSnap.docs[0];
    const d = doc.data();
    
    console.log('현재 상태:');
    console.log('  startDate:', d.startDate);
    console.log('  endDate:', d.endDate);
    console.log('  credits:', d.credits);
    console.log('  upcoming:', JSON.stringify(d.upcomingMembership));
    
    if (d.upcomingMembership) {
        console.log('\n⚠ upcomingMembership이 이미 존재합니다. 수정 불필요.');
        process.exit(0);
    }

    // 매출 기록에서 TBD 건을 찾아 복구
    const salesSnap = await tdb.collection('sales')
        .where('memberId', '==', doc.id)
        .where('startDate', '==', 'TBD')
        .get();
    
    if (salesSnap.empty) {
        console.log('\n⚠ TBD 매출 기록이 없습니다.');
        process.exit(0);
    }

    const sale = salesSnap.docs[0].data();
    console.log('\nTBD 매출 기록 발견:', sale.item, sale.amount + '원');

    // upcomingMembership 복구
    const upcomingData = {
        membershipType: d.membershipType || 'general',
        credits: 10, // 10회권
        startDate: 'TBD',
        endDate: 'TBD',
        durationMonths: 3, // 3개월
        price: sale.amount || 200000
    };

    await doc.ref.update({ upcomingMembership: upcomingData });
    
    console.log('\n✅ upcomingMembership 복구 완료!');
    console.log(JSON.stringify(upcomingData, null, 2));
    console.log('\n이제 현재 회원권(15회) 만료 후 자동으로 10회권이 활성화됩니다.');
    
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
