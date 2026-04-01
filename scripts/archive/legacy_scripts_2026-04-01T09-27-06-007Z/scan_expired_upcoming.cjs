/**
 * 전수조사: 현재 회원권이 만료(기간 or 횟수 소진)되었는데
 * upcomingMembership이 TBD로 대기 중인 회원 검출
 * → 박혜린과 동일한 케이스: 즉시 활성화가 필요한 회원
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const acc = require('../functions/service-account-key.json');
try { initializeApp({ credential: cert(acc) }); } catch(e) {}
const db = getFirestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  기준일: ${today}`);
    console.log(`  조건: 현재 회원권 만료 + upcomingMembership(TBD) 대기 중`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const membersSnap = await tdb.collection('members').get();
    const members = membersSnap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));
    
    const activeMembers = members.filter(m => !m.deletedAt);
    console.log(`활성 회원 수: ${activeMembers.length}명\n`);

    // upcomingMembership이 있는 회원 목록
    const withUpcoming = activeMembers.filter(m => m.upcomingMembership);
    console.log(`upcomingMembership 보유 회원: ${withUpcoming.length}명\n`);

    const needsActivation = [];
    const waitingNormally = [];

    for (const m of withUpcoming) {
        const up = m.upcomingMembership;
        const isTBD = up.startDate === 'TBD';
        
        // 현재 회원권 만료 여부 체크
        let isExpired = false;
        let isExhausted = false;
        let reason = '';
        
        // 기간 만료
        if (m.endDate && m.endDate !== 'TBD' && m.endDate !== 'unlimited') {
            if (m.endDate < today) {
                isExpired = true;
                reason = `기간만료(${m.endDate})`;
            }
        }
        
        // 횟수 소진
        if ((m.credits || 0) <= 0) {
            isExhausted = true;
            reason += (reason ? ' + ' : '') + `횟수소진(${m.credits}회)`;
        }

        if (isTBD && (isExpired || isExhausted)) {
            needsActivation.push({
                name: m.name,
                phone: m.phone,
                id: m.id,
                currentEnd: m.endDate,
                currentCredits: m.credits,
                upCredits: up.credits,
                upDuration: up.durationMonths,
                upPrice: up.price,
                reason: reason
            });
        } else {
            waitingNormally.push({
                name: m.name,
                phone: m.phone,
                isTBD: isTBD,
                currentEnd: m.endDate,
                currentCredits: m.credits,
                upStartDate: up.startDate
            });
        }
    }

    // 결과 출력
    if (needsActivation.length > 0) {
        console.log(`🔴 즉시 활성화 필요: ${needsActivation.length}명`);
        console.log('─────────────────────────────────────────');
        needsActivation.forEach(m => {
            console.log(`  ⚠ ${m.name} (${m.phone})`);
            console.log(`    현재: 종료=${m.currentEnd}, 잔여=${m.currentCredits}회 → ${m.reason}`);
            console.log(`    대기: ${m.upCredits}회, ${m.upDuration}개월, ${(m.upPrice||0).toLocaleString()}원`);
            console.log('');
        });
    } else {
        console.log('✅ 즉시 활성화가 필요한 회원이 없습니다.');
    }

    if (waitingNormally.length > 0) {
        console.log(`\n🟢 정상 대기 중: ${waitingNormally.length}명 (현재 회원권 아직 유효)`);
        console.log('─────────────────────────────────────────');
        waitingNormally.forEach(m => {
            const status = m.isTBD ? 'TBD' : `시작예정:${m.upStartDate}`;
            console.log(`  ✓ ${m.name} (${m.phone}) | 종료:${m.currentEnd} 잔여:${m.currentCredits}회 | 선등록: ${status}`);
        });
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  스캔 완료`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
