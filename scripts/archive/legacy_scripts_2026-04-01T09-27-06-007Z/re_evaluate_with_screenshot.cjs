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
    console.log('  [최종 엔진 검증] 절댓값 거리 배정 + 스크린샷 팩트 체크 적용');
    console.log('='.repeat(70));

    const eventsSnap = await tdb.collection('practice_events').where('date', '==', '2026-03-30').get();
    const attSnap = await tdb.collection('attendance').where('date', '==', '2026-03-30').get();
    const safeMembers = new Set();
    attSnap.forEach(d => safeMembers.add(d.data().memberId));

    const evts = [];
    eventsSnap.forEach(doc => {
        if (safeMembers.has(doc.id)) return;
        const d = doc.data();
        if (EXCLUDE_MEMBERS.has(d.memberId)) return;
        
        let createdAt = d.createdAt;
        if (!createdAt) return;
        if (typeof createdAt === 'object' && createdAt.toDate) createdAt = createdAt.toDate();
        const kstHour = (createdAt.getUTCHours() + 9) % 24;
        
        if (kstHour >= 15) {
            evts.push({
                memberId: d.memberId,
                time: createdAt,
                timeStr: createdAt.toLocaleString('ko-KR', {timeZone:'Asia/Seoul', hourCycle: 'h23', timeStyle: 'medium'})
            });
        }
    });

    // Name Map
    const memberMeta = new Map();
    for (const ev of evts) {
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

    // Screenshot Fact Overrides
    const SCREENSHOT_FACTS = {
        '최규화': 'gwangheungchang',
        '김지수': 'gwangheungchang',
        '하은진': 'gwangheungchang'
    };

    const validEvts = evts.filter(ev => {
        const name = memberMeta.get(ev.memberId).name;
        return !EXCLUDE_NAMES.has(name) && name !== '알수없음';
    });

    const groups = new Map();
    validEvts.forEach(ev => {
        if (!groups.has(ev.memberId)) groups.set(ev.memberId, []);
        groups.get(ev.memberId).push(ev);
    });

    const restores = [];
    for (const [mId, arr] of groups.entries()) {
        arr.sort((a, b) => a.time - b.time);
        
        let lastTime = null;
        for (const ev of arr) {
            if (lastTime === null) {
                restores.push(ev);
                lastTime = ev.time;
            } else {
                const diffMins = (ev.time - lastTime) / (1000 * 60);
                if (diffMins >= 50) { 
                    ev.isBackToBack = true;
                    restores.push(ev);
                    lastTime = ev.time;
                }
            }
        }
    }

    const classes = {
        G1900: [], G2020: [], M1840: [], M1950: [], M2100: [], Unknown: []
    };

    restores.forEach(ev => {
        const meta = memberMeta.get(ev.memberId);
        
        // 스크린샷 팩트 덮어쓰기
        if (SCREENSHOT_FACTS[meta.name]) {
            meta.branchId = SCREENSHOT_FACTS[meta.name];
        }

        const currentMin = parseInt(ev.timeStr.split(':')[0]) * 60 + parseInt(ev.timeStr.split(':')[1]);
        
        let entry = `${ev.timeStr} | ${meta.name}`;
        if (ev.isBackToBack) entry += ' ⬅️ [연강 출석 인정!]';

        if (meta.branchId === 'gwangheungchang') {
            // Absolute Distance Logic
            const d1900 = Math.abs(currentMin - (19*60));
            const d2020 = Math.abs(currentMin - (20*60 + 20));
            if (d1900 <= d2020) classes.G1900.push(entry);
            else classes.G2020.push(entry);
        } else if (meta.branchId === 'mapo') {
            const d1840 = Math.abs(currentMin - (18*60 + 40));
            const d1950 = Math.abs(currentMin - (19*60 + 50));
            const d2100 = Math.abs(currentMin - (21*60));
            
            if (d1840 <= d1950 && d1840 <= d2100) classes.M1840.push(entry);
            else if (d1950 <= d1840 && d1950 <= d2100) classes.M1950.push(entry);
            else classes.M2100.push(entry);
        } else {
            classes.Unknown.push(entry);
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

    console.log(`\n[❓ 지점 미상] (${classes.Unknown.length}명 - 광흥창 19:00 또는 마포 18:40)`);
    classes.Unknown.sort().forEach(x => console.log('    ' + x));

    let total = 0;
    for(const k in classes) total += classes[k].length;

    console.log(`\n======================================================`);
    console.log(`  최종 복구 대기 횟수: 총 ${total} 티켓`);
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
