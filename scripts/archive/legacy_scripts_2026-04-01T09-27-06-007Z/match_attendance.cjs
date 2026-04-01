/**
 * 원장님께서 확인해주신 실제 인원수와 practice_events 대조 분석
 *
 * <목표치>
 * 광흥창 (총 26명)
 * - 19:00: 15명
 * - 20:20: 11명
 * 
 * 마포 (총 17명)
 * - 18:40: 5명
 * - 19:50: 5명
 * - 21:00: 7명
 * 
 * 총 43명
 */
const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tenantId = 'boksaem-yoga';
const tdb = db.collection('studios').doc(tenantId);

async function run() {
    console.log('='.repeat(70));
    console.log('  정밀 매칭: 원장님 실제 카운트 vs 시스템 이벤트 로그');
    console.log('='.repeat(70));

    // 1. practice_events에서 삭제된 저녁 이벤트 추출
    const eventsSnap = await tdb.collection('practice_events')
        .where('date', '==', '2026-03-30')
        .get();
    
    // 현존 출석 ID
    const attSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .get();
    const existingAttIds = new Set();
    attSnap.forEach(doc => existingAttIds.add(doc.id));

    const victimsByBranch = {
        gwangheungchang: [],
        mapo: [],
        unknown: []
    };
    
    // 비동기 처리 위해 배열에 담기
    const eventDocs = [];
    eventsSnap.forEach(doc => eventDocs.push(doc));

    for (const doc of eventDocs) {
        if (existingAttIds.has(doc.id)) continue; 
        
        const d = doc.data();
        let createdAt = d.createdAt;
        if (!createdAt) continue;
        if (typeof createdAt === 'object' && createdAt.toDate) createdAt = createdAt.toDate();
        
        const utcHour = createdAt.getUTCHours();
        const kstHour = (utcHour + 9) % 24;
        if (kstHour < 15) continue; // 15시 전 출석은 제외 (오전수업)
        
        const memberId = d.memberId;
        if (memberId === 'demo-member') continue;

        const kstTime = createdAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
        // 시간만 추출 (예: 18:40:00)
        const timePart = createdAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hourCycle: 'h23', timeStyle: 'medium' });

        const memberDoc = await tdb.collection('members').doc(memberId).get();
        if (memberDoc.exists) {
            const m = memberDoc.data();
            const branch = m.branchId || 'unknown';
            const victim = {
                memberId, name: m.name, time: kstTime, timeStr: timePart
            };
            if (victimsByBranch[branch]) victimsByBranch[branch].push(victim);
            else victimsByBranch.unknown.push(victim);
        }
    }

    // 시간순 정렬
    for (const br in victimsByBranch) {
        victimsByBranch[br].sort((a, b) => a.timeStr.localeCompare(b.timeStr));
    }

    console.log('\n[📍 광흥창점] 목표: 19:00(15명) + 20:20(11명) = 총 26명');
    console.log(`  🔍 발견된 삭제 기록: ${victimsByBranch.gwangheungchang.length}명`);
    victimsByBranch.gwangheungchang.forEach(v => {
        console.log(`    - ${v.timeStr} | ${v.name}`);
    });

    console.log('\n[📍 마포점] 목표: 18:40(5명) + 19:50(5명) + 21:00(7명) = 총 17명');
    console.log(`  🔍 발견된 삭제 기록: ${victimsByBranch.mapo.length}명`);
    victimsByBranch.mapo.forEach(v => {
        console.log(`    - ${v.timeStr} | ${v.name}`);
    });

    console.log('\n[❓ 지점 미상 (Unknown)]');
    victimsByBranch.unknown.forEach(v => {
        console.log(`    - ${v.timeStr} | ${v.name}`);
    });

    console.log('\n======================================================================');
    process.exit(0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
