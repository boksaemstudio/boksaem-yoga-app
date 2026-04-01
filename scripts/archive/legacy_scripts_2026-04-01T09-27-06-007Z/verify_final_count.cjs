const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tenantId = 'boksaem-yoga';
const tdb = db.collection('studios').doc(tenantId);

const EXCLUDED_MEMBERS = new Set(['ssKsChLghzYc9UaD0nNb', 'wBGdzNiUifYs80Wzu4Ay', 'FXetUW5Mpi2dgAVulVPz', 'd5dOhmZNi8wTm7iCFPlB', 'demo-member']);

async function run() {
    console.log('='.repeat(70));
    console.log('  정밀 카운트: 원장님 실제 인원(43명) vs 복구 대상자 명단');
    console.log('='.repeat(70));

    const eventsSnap = await tdb.collection('practice_events').where('date', '==', '2026-03-30').get();
    const attSnap = await tdb.collection('attendance').where('date', '==', '2026-03-30').get();
    
    // 현존하는 출석자 (이미 무사한 분들)
    const safeMembers = new Set();
    attSnap.forEach(d => safeMembers.add(d.data().memberId));

    const restoreMap = new Map();
    eventsSnap.forEach(doc => {
        if (safeMembers.has(doc.id)) return;
        const d = doc.data();
        let createdAt = d.createdAt;
        if (!createdAt) return;
        if (typeof createdAt === 'object' && createdAt.toDate) createdAt = createdAt.toDate();
        const kstHour = (createdAt.getUTCHours() + 9) % 24;
        
        if (kstHour >= 15 && !EXCLUDED_MEMBERS.has(d.memberId)) {
            if (!restoreMap.has(d.memberId) || createdAt < restoreMap.get(d.memberId).time) {
                restoreMap.set(d.memberId, { time: createdAt, timeStr: createdAt.toLocaleString('ko-KR', {timeZone:'Asia/Seoul', hour12:false}).split('. ')[3] });
            }
        }
    });

    const categories = { G1900: [], G2020: [], M1840: [], M1950: [], M2100: [], Unknown: [] };
    
    for (const [memberId, info] of restoreMap) {
        const m = (await tdb.collection('members').doc(memberId).get()).data() || {};
        const h = parseInt(info.timeStr.split(':')[0]);
        const mnt = parseInt(info.timeStr.split(':')[1]);
        
        const entry = `${info.timeStr} | ${m.name || '알수없음'} (${m.branchId || '미상'})`;
        
        if (m.branchId === 'gwangheungchang') {
            if (h <= 19) categories.G1900.push(entry);
            else categories.G2020.push(entry);
        } else if (m.branchId === 'mapo') {
            if (h === 18) categories.M1840.push(entry);
            else if (h === 19) categories.M1950.push(entry);
            else categories.M2100.push(entry);
        } else {
            categories.Unknown.push(entry);
        }
    }

    console.log(`\n[📍 광흥창] 원장님 목표: 26명 (19:00 15명 / 20:20 11명)`);
    console.log(`  🔍 기계 로그에서 찾아낸 실제 삭제자: ${categories.G1900.length + categories.G2020.length}명`);
    categories.G1900.forEach(x => console.log('    [19:00대] ' + x));
    categories.G2020.forEach(x => console.log('    [20:20대] ' + x));

    console.log(`\n[📍 마포] 원장님 목표: 17명 (18:40 5명 / 19:50 5명 / 21:00 7명)`);
    console.log(`  🔍 기계 로그에서 찾아낸 실제 삭제자: ${categories.M1840.length + categories.M1950.length + categories.M2100.length}명`);
    categories.M1840.forEach(x => console.log('    [18:40대] ' + x));
    categories.M1950.forEach(x => console.log('    [19:50대] ' + x));
    categories.M2100.forEach(x => console.log('    [21:00대] ' + x));

    console.log(`\n[❓ 지점 미상] (정보 누락자): ${categories.Unknown.length}명`);
    categories.Unknown.forEach(x => console.log('    ' + x));

    console.log(`\n======================================================`);
    console.log(`  총 복구 대상자: ${restoreMap.size}명. (원장님 말씀하신 43명 중 12명 비어요)`);
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
