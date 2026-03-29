/**
 * 박혜린: upcomingMembership을 즉시 활성화
 * - 이전 회원권 종료일: 어제(3/28) → 만료됨
 * - 오늘 재등록(TBD) + 오늘 아침 출석함
 * - 선등록 회원권을 오늘부터 시작으로 활성화, 오늘 출석 1회 차감
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
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
    
    if (!d.upcomingMembership) {
        console.log('\n⚠ upcomingMembership이 없습니다. fix_hyerin.cjs를 먼저 실행하세요.');
        process.exit(1);
    }

    const today = '2026-03-29';
    const durationMonths = d.upcomingMembership.durationMonths || 3;
    
    // 종료일 계산: 오늘 + 3개월 - 1일
    const endDate = new Date(today + 'T00:00:00+09:00');
    endDate.setMonth(endDate.getMonth() + durationMonths);
    endDate.setDate(endDate.getDate() - 1);
    const endDateStr = endDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

    // 원장이 기존 잔여 횟수를 더해서 13회로 수동 세팅함
    // 오늘 출석 1회 차감: 13 - 1 = 12
    const ownerSetCredits = d.credits || d.upcomingMembership.credits;
    const newCredits = ownerSetCredits - 1;

    const updateData = {
        startDate: today,
        endDate: endDateStr,
        credits: newCredits,
        membershipType: d.upcomingMembership.membershipType || d.membershipType,
        duration: durationMonths,
        regDate: today,
        price: d.upcomingMembership.price || d.price,
        upcomingMembership: FieldValue.delete() // 선등록 필드 삭제 (활성화 완료)
    };

    console.log('\n활성화 내용:');
    console.log('  시작일:', today);
    console.log('  종료일:', endDateStr, `(${durationMonths}개월)`);
    console.log('  잔여횟수:', newCredits, '(10회 - 오늘출석 1회)');

    await doc.ref.update(updateData);

    // 매출 기록도 TBD → 실제 날짜로 업데이트
    const salesSnap = await tdb.collection('sales')
        .where('memberId', '==', doc.id)
        .where('startDate', '==', 'TBD')
        .get();
    
    if (!salesSnap.empty) {
        const batch = db.batch();
        salesSnap.forEach(s => {
            batch.update(s.ref, { startDate: today, endDate: endDateStr });
        });
        await batch.commit();
        console.log(`  매출 기록 ${salesSnap.size}건 TBD → 실일자 업데이트`);
    }

    console.log('\n✅ 박혜린 회원권 활성화 완료!');
    console.log(`   10회권 (3개월) | ${today} ~ ${endDateStr} | 잔여 ${newCredits}회`);
    
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
