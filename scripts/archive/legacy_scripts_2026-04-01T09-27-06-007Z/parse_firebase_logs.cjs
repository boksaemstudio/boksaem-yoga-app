const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tenantId = 'boksaem-yoga';
const tdb = db.collection('studios').doc(tenantId);

const EXCLUDE_MEMBERS = new Set(['ssKsChLghzYc9UaD0nNb', 'wBGdzNiUifYs80Wzu4Ay', 'FXetUW5Mpi2dgAVulVPz', 'd5dOhmZNi8wTm7iCFPlB', 'demo-member']);
const EXCLUDE_NAMES = new Set(['송미호', '정계수']);

async function run() {
    console.log('='.repeat(70));
    console.log('  [🔥 갓 모드 달성] Firebase 서버 1차 원본 로그 자동 분석 + 절댓값 엔진 결합');
    console.log('='.repeat(70));

    // 1. 파이어베이스 로그 파싱해서 "진짜" 지점 알아내기
    const LOG_FACTS = {};
    try {
        const logData = fs.readFileSync(path.join(__dirname, '../tests/downloaded-logs-20260331-031943.csv'), 'utf8');
        const lines = logData.split('\n');
        for (const line of lines) {
            const match = line.match(/Check-in request for ([A-Za-z0-9]+) in (mapo|gwangheungchang)/i);
            if (match) {
                const cId = match[1];
                const cBranch = match[2].toLowerCase();
                LOG_FACTS[cId] = cBranch;
            }
        }
    } catch(e) {
        console.log("Log parse error:", e.message);
    }

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

    let logMatchedCount = 0;

    restores.forEach(ev => {
        const meta = memberMeta.get(ev.memberId);
        
        // 🔥 LOGS OVERRIDE EVERTYHING (The absolute truth of which kiosk they pressed)
        if (LOG_FACTS[ev.memberId]) {
            meta.branchId = LOG_FACTS[ev.memberId];
            logMatchedCount++;
        }

        const currentMin = parseInt(ev.timeStr.split(':')[0]) * 60 + parseInt(ev.timeStr.split(':')[1]);
        
        let entry = `${ev.timeStr} | ${meta.name}`;
        if (ev.isBackToBack) entry += ' ⬅️ [연강 출석 인정!]';

        if (meta.branchId === 'gwangheungchang') {
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

    console.log(`\n✅ 서버 원본 로그와 대조하여 ${logMatchedCount}명의 실제 출석 기기(지점)를 100% 확정했습니다.`);

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
