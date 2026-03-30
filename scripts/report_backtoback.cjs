const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tenantId = 'boksaem-yoga';
const tdb = db.collection('studios').doc(tenantId);

const EXCLUDE_MEMBERS = new Set(['ssKsChLghzYc9UaD0nNb', 'wBGdzNiUifYs80Wzu4Ay', 'FXetUW5Mpi2dgAVulVPz', 'd5dOhmZNi8wTm7iCFPlB', 'demo-member']);
const EXCLUDE_NAMES = new Set(['송미호', '정계수']);

async function run() {
    console.log('='.repeat(70));
    console.log('  정밀 분석: 원장님 통찰에 따른 연강(Back-to-Back) 분리 리포트');
    console.log('='.repeat(70));

    const eventsSnap = await tdb.collection('practice_events').where('date', '==', '2026-03-30').get();
    const attSnap = await tdb.collection('attendance').where('date', '==', '2026-03-30').get();
    const safeMembers = new Set();
    attSnap.forEach(d => safeMembers.add(d.data().memberId));

    const allValidEvents = [];

    eventsSnap.forEach(doc => {
        if (safeMembers.has(doc.id)) return;
        const d = doc.data();
        if (EXCLUDE_MEMBERS.has(d.memberId)) return;
        
        let createdAt = d.createdAt;
        if (!createdAt) return;
        if (typeof createdAt === 'object' && createdAt.toDate) createdAt = createdAt.toDate();
        const kstHour = (createdAt.getUTCHours() + 9) % 24;
        
        if (kstHour >= 15) {
            allValidEvents.push({
                docId: doc.id,
                memberId: d.memberId,
                time: createdAt,
                timeStr: createdAt.toLocaleString('ko-KR', {timeZone:'Asia/Seoul', hourCycle: 'h23', timeStyle: 'medium'})
            });
        }
    });

    // 회원 정보 매핑
    const memberMeta = new Map();
    for (const ev of allValidEvents) {
        if (!memberMeta.has(ev.memberId)) {
            const mDoc = await tdb.collection('members').doc(ev.memberId).get();
            if (mDoc.exists) {
                const m = mDoc.data();
                memberMeta.set(ev.memberId, { name: m.name || '알수없음', branchId: m.branchId || 'unknown' });
            } else {
                memberMeta.set(ev.memberId, { name: '알수없음', branchId: 'unknown' });
            }
        }
    }

    // 이름 필터링
    const finalEvents = allValidEvents.filter(ev => {
        const meta = memberMeta.get(ev.memberId);
        return !EXCLUDE_NAMES.has(meta.name);
    });

    // member별로 그룹핑하여 1시간 이상 차이나는 연강 추출
    const groupedByMember = new Map();
    finalEvents.forEach(ev => {
        if (!groupedByMember.has(ev.memberId)) groupedByMember.set(ev.memberId, []);
        groupedByMember.get(ev.memberId).push(ev);
    });

    const validRestores = [];

    for (const [mId, evts] of groupedByMember.entries()) {
        evts.sort((a, b) => a.time - b.time);
        
        let lastTime = null;
        for (const ev of evts) {
            if (lastTime === null) {
                validRestores.push(ev);
                lastTime = ev.time;
            } else {
                // 원장님 지시: 1시간(60분) 이상 차이나면 연강이므로 진짜 출석으로 인정
                const diffMins = (ev.time - lastTime) / (1000 * 60);
                if (diffMins >= 50) { // 50분 이상 차이면 연강으로 간주 (수업 텀 고려)
                    ev.isBackToBack = true;
                    validRestores.push(ev);
                    lastTime = ev.time;
                } else {
                    // 50분 이내 중복 터치면 무시 (오류)
                }
            }
        }
    }

    const classes = {
        G1900: [], G2020: [], M1840: [], M1950: [], M2100: [], Unknown: []
    };

    validRestores.forEach(ev => {
        const meta = memberMeta.get(ev.memberId);
        const h = parseInt(ev.timeStr.split(':')[0]);
        let entry = `${ev.timeStr} | ${meta.name}`;
        if (ev.isBackToBack) entry += ' ⬅️ [2연강 출석 인정]';

        if (meta.branchId === 'gwangheungchang') {
            if (h <= 19) classes.G1900.push(entry);
            else classes.G2020.push(entry);
        } else if (meta.branchId === 'mapo') {
            if (h === 18) classes.M1840.push(entry);
            else if (h === 19) classes.M1950.push(entry);
            else classes.M2100.push(entry);
        } else {
            if (meta.name !== "알수없음") classes.Unknown.push(entry);
        }
    });

    console.log(`\n[📍 광흥창] 총 기대수: 26 (15 + 11) | 발견된 총 출석: ${classes.G1900.length + classes.G2020.length}`);
    console.log(`  🧘 19:00 하타 (${classes.G1900.length}명)`);
    classes.G1900.sort().forEach(x => console.log('    ' + x));
    console.log(`  🧘 20:20 아쉬탕가 (${classes.G2020.length}명)`);
    classes.G2020.sort().forEach(x => console.log('    ' + x));

    console.log(`\n[📍 마포] 총 기대수: 17 (5 + 5 + 7) | 발견된 총 출석: ${classes.M1840.length + classes.M1950.length + classes.M2100.length}`);
    console.log(`  🧘 18:40 인요가 (${classes.M1840.length}명)`);
    classes.M1840.sort().forEach(x => console.log('    ' + x));
    console.log(`  🧘 19:50 하타 (${classes.M1950.length}명)`);
    classes.M1950.sort().forEach(x => console.log('    ' + x));
    console.log(`  🧘 21:00 플라잉 (${classes.M2100.length}명)`);
    classes.M2100.sort().forEach(x => console.log('    ' + x));

    console.log(`\n[❓ 지점 미상] (${classes.Unknown.length}명)`);
    classes.Unknown.sort().forEach(x => console.log('    ' + x));

    console.log(`\n======================================================`);
    console.log(`  최종 복구 진행할 "출석 기록(티켓) 수": 총 ${validRestores.filter(ev => memberMeta.get(ev.memberId).name !== '알수없음').length}개`);
    console.log(`  -> 연강을 2번의 출석으로 정상 계산함.`);
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
