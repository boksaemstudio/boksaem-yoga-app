/**
 * 긴급 복구: TBD 매출이 있지만 upcomingMembership이 누락된 3명 자동 복구
 * + regDate 누락 773명 일괄 보정 (startDate를 regDate로 설정)
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const acc = require('../functions/service-account-key.json');
try { initializeApp({ credential: cert(acc) }); } catch(e) {}
const db = getFirestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  [1/2] TBD 매출 누락 회원 upcomingMembership 복구');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const membersSnap = await tdb.collection('members').get();
    const members = membersSnap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));

    const salesSnap = await tdb.collection('sales').get();
    const sales = salesSnap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));

    const tbdSales = sales.filter(s => s.startDate === 'TBD');
    let fixedCount = 0;

    for (const sale of tbdSales) {
        const member = members.find(m => m.id === sale.memberId);
        if (!member || member.deletedAt) continue;
        if (member.upcomingMembership) continue; // 이미 있으면 스킵
        if (member.startDate === 'TBD') continue; // 현재 멤버 자체가 TBD면 정상 (upcoming 아님)

        // 매출 기록에서 duration 추출 (item명에서 파싱)
        let durationMonths = member.duration || 3; // 기본값 3개월
        const itemMatch = (sale.item || '').match(/(\d+)개월/);
        if (itemMatch) durationMonths = parseInt(itemMatch[1]);

        // TTC는 보통 장기 (5개월)
        if ((sale.item || '').includes('TTC')) durationMonths = 5;

        // credits 추출 (item명에서 파싱)
        let credits = 10; // 기본값
        const creditMatch = (sale.item || '').match(/(\d+)회/);
        if (creditMatch) credits = parseInt(creditMatch[1]);
        if ((sale.item || '').includes('월 8회')) credits = 8;
        if ((sale.item || '').includes('TTC')) credits = 9999;

        const upcomingData = {
            membershipType: member.membershipType || 'general',
            credits: credits,
            startDate: 'TBD',
            endDate: 'TBD',
            durationMonths: durationMonths,
            price: sale.amount || 0
        };

        await member.ref.update({ upcomingMembership: upcomingData });
        fixedCount++;
        console.log(`✅ ${member.name} (${member.phone})`);
        console.log(`   항목: ${sale.item} | ${sale.amount}원`);
        console.log(`   복구: credits=${credits}, duration=${durationMonths}개월`);
        console.log('');
    }

    console.log(`→ ${fixedCount}명 복구 완료\n`);

    // ─── [2/2] regDate 보정 ───
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  [2/2] regDate 누락 회원 일괄 보정');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const noRegDate = members.filter(m => !m.deletedAt && !m.regDate && m.startDate);
    console.log(`대상: ${noRegDate.length}명 (startDate → regDate 복사)\n`);

    // Firestore batch는 500개 제한
    const batchSize = 450;
    for (let i = 0; i < noRegDate.length; i += batchSize) {
        const batch = db.batch();
        const chunk = noRegDate.slice(i, i + batchSize);
        
        chunk.forEach(m => {
            batch.update(m.ref, { regDate: m.startDate });
        });

        await batch.commit();
        console.log(`  배치 ${Math.floor(i / batchSize) + 1}: ${chunk.length}명 처리`);
    }

    console.log(`\n→ ${noRegDate.length}명 regDate 보정 완료`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  전체 복구 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
