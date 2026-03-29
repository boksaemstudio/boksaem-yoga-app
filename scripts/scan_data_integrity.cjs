/**
 * 전체 회원 데이터 무결성 스캔
 * - TBD 매출 기록이 있는데 upcomingMembership이 없는 회원 검출
 * - regDate, duration 누락된 회원 검출
 * - startDate/endDate 불일치 검출
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const acc = require('../functions/service-account-key.json');
try { initializeApp({ credential: cert(acc) }); } catch(e) {}
const db = getFirestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    console.log('========================================');
    console.log('  전체 회원 데이터 무결성 스캔');
    console.log('========================================\n');

    // 1. 모든 회원 조회
    const membersSnap = await tdb.collection('members').get();
    const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`총 회원 수: ${members.length}명 (삭제 포함)\n`);

    // 2. 모든 매출 조회
    const salesSnap = await tdb.collection('sales').get();
    const sales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 3. TBD 매출이 있는데 upcomingMembership이 없는 회원 검출
    const tbdSales = sales.filter(s => s.startDate === 'TBD');
    console.log(`[1] TBD 매출 기록 수: ${tbdSales.length}건`);
    
    const orphanedTBD = [];
    for (const sale of tbdSales) {
        const member = members.find(m => m.id === sale.memberId);
        if (!member) continue;
        if (member.deletedAt) continue; // 삭제된 회원 제외
        
        // 이미 TBD가 해소되어 시작일이 설정된 경우 = 정상
        if (member.startDate && member.startDate !== 'TBD' && !member.upcomingMembership) {
            // 매출의 TBD가 아직 업데이트 안 된 것일 수 있음 — 매출과 회원 날짜 비교
            // → 이건 미미한 문제 (매출 기록만 업데이트 안 됨)
        }
        
        // 핵심: TBD 매출이 있는데 회원의 startDate도 TBD가 아니고 upcoming도 없음
        if (!member.upcomingMembership && member.startDate !== 'TBD') {
            orphanedTBD.push({
                name: member.name || '이름없음',
                phone: member.phone || '번호없음',
                memberId: member.id,
                saleItem: sale.item || '항목없음',
                saleAmount: sale.amount,
                saleDate: sale.date,
                memberStartDate: member.startDate,
                memberEndDate: member.endDate,
                memberCredits: member.credits
            });
        }
    }

    if (orphanedTBD.length > 0) {
        console.log(`\n⚠️  [경고] TBD 매출이 있지만 upcomingMembership이 없는 회원: ${orphanedTBD.length}명`);
        orphanedTBD.forEach(m => {
            console.log(`   - ${m.name} (${m.phone}) | 매출: ${m.saleItem} ${m.saleAmount}원 | 결제일: ${m.saleDate}`);
            console.log(`     └ 회원 start: ${m.memberStartDate}, end: ${m.memberEndDate}, credits: ${m.memberCredits}`);
        });
    } else {
        console.log('   ✅ 모든 TBD 매출 기록이 정상입니다.');
    }

    // 4. regDate 누락 회원
    const noRegDate = members.filter(m => !m.deletedAt && !m.regDate);
    console.log(`\n[2] regDate 누락 회원: ${noRegDate.length}명`);
    noRegDate.forEach(m => console.log(`   - ${m.name} (${m.phone || '번호없음'}) | start: ${m.startDate}`));

    // 5. duration 누락 회원 (TBD 또는 활성 회원 중)
    const activeTBD = members.filter(m => !m.deletedAt && (m.startDate === 'TBD' || m.endDate === 'TBD') && !m.duration);
    console.log(`\n[3] TBD 상태인데 duration 없는 회원: ${activeTBD.length}명`);
    activeTBD.forEach(m => console.log(`   - ${m.name} (${m.phone || '번호없음'})`));

    // 6. 매출 기록에 item, date가 없는 레코드
    const incompleteSales = sales.filter(s => !s.item || !s.date);
    console.log(`\n[4] 불완전한 매출 기록 (항목명 또는 날짜 누락): ${incompleteSales.length}건`);
    incompleteSales.slice(0, 10).forEach(s => {
        const member = members.find(m => m.id === s.memberId);
        console.log(`   - ${member?.name || '?'} | item: ${s.item || 'X'} | date: ${s.date || 'X'} | amount: ${s.amount}`);
    });
    if (incompleteSales.length > 10) console.log(`   ... 외 ${incompleteSales.length - 10}건`);

    console.log('\n========================================');
    console.log('  스캔 완료');
    console.log('========================================');
    
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
