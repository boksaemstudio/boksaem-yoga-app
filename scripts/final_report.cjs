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
    console.log('  최종 요약 리뷰: 원장님 실제 카운트 vs 시스템 발굴 명단 (중복 터치 포함)');
    console.log('='.repeat(70));

    const eventsSnap = await tdb.collection('practice_events').where('date', '==', '2026-03-30').get();
    const attSnap = await tdb.collection('attendance').where('date', '==', '2026-03-30').get();
    const safeMembers = new Set();
    attSnap.forEach(d => safeMembers.add(d.data().memberId));

    // memberId -> { name, times: [], branchId }
    const memberMap = new Map();

    eventsSnap.forEach(doc => {
        if (safeMembers.has(doc.id)) return;
        const d = doc.data();
        if (EXCLUDE_MEMBERS.has(d.memberId)) return;
        
        let createdAt = d.createdAt;
        if (!createdAt) return;
        if (typeof createdAt === 'object' && createdAt.toDate) createdAt = createdAt.toDate();
        const kstHour = (createdAt.getUTCHours() + 9) % 24;
        
        if (kstHour >= 15) { // 저녁 시간대 한정
            const timeStr = createdAt.toLocaleString('ko-KR', {timeZone:'Asia/Seoul', hourCycle: 'h23', timeStyle: 'medium'});
            if (!memberMap.has(d.memberId)) {
                memberMap.set(d.memberId, { times: [timeStr], branchId: 'unknown', name: '알수없음' });
            } else {
                memberMap.get(d.memberId).times.push(timeStr);
            }
        }
    });

    // 회원 상세정보 머지
    for (const [memberId, info] of memberMap.entries()) {
        const mDoc = await tdb.collection('members').doc(memberId).get();
        if (mDoc.exists) {
            const m = mDoc.data();
            if (m.name && EXCLUDE_NAMES.has(m.name)) {
                memberMap.delete(memberId);
                continue;
            }
            info.name = m.name || '알수없음';
            info.branchId = m.branchId || 'unknown';
        }
    }

    // 시간 오름차순 정렬 (최초 터치 기준)
    for (const info of memberMap.values()) {
        info.times.sort();
    }

    const classes = {
        G1900: { title: '[광흥창] 19:00 하타 (목표 15명)', members: [] },
        G2020: { title: '[광흥창] 20:20 아쉬탕가 (목표 11명)', members: [] },
        M1840: { title: '[마포] 18:40 인요가 (목표 5명)', members: [] },
        M1950: { title: '[마포] 19:50 하타 (목표 5명)', members: [] },
        M2100: { title: '[마포] 21:00 플라잉 (목표 7명)', members: [] },
        Unknown: { title: '[지점 미상] (광흥창 19:00 / 마포 18:40 가능성 큼)', members: [] }
    };

    const duplicateTouchers = [];

    for (const [memberId, info] of memberMap.entries()) {
        const firstTime = info.times[0];
        const h = parseInt(firstTime.split(':')[0]);
        const timesStr = info.times.length > 1 ? `(푸시 ${info.times.length}번: ${info.times.join(', ')})` : `(${firstTime})`;

        if (info.times.length > 1) {
            duplicateTouchers.push({ name: info.name, branch: info.branchId, times: info.times });
        }

        const entry = `${info.name.padEnd(8, ' ')} ${timesStr} ${info.times.length > 1 ? '🔄 다중 출석!' : ''}`;

        if (info.branchId === 'gwangheungchang') {
            if (h <= 19) classes.G1900.members.push(entry);
            else classes.G2020.members.push(entry);
        } else if (info.branchId === 'mapo') {
            if (h === 18) classes.M1840.members.push(entry);
            else if (h === 19) classes.M1950.members.push(entry);
            else classes.M2100.members.push(entry);
        } else {
            if (info.name !== "알수없음") classes.Unknown.members.push(entry);
        }
    }

    for (const key in classes) {
        console.log(`\n${classes[key].title} - [발견: ${classes[key].members.length}명]`);
        classes[key].members.sort().forEach(m => console.log(`  - ${m}`));
    }

    console.log('\n======================================================');
    console.log(' 🔥 강사앱에 여러 번 푸시가 발송된 "중복 터치 회원" 내역 🔥');
    console.log('======================================================');
    if (duplicateTouchers.length === 0) {
        console.log('  중복 터치 회원이 없습니다.');
    } else {
        duplicateTouchers.forEach(dt => {
            console.log(`  🚨 ${dt.name} (${dt.branch === 'mapo' ? '마포' : '광흥창'})`);
            console.log(`       터치 시각들: ${dt.times.join(', ')}`);
        });
    }

    console.log(`\n  ✅ 최종 복원 대상: 총 ${memberMap.size}명. (익명 제외 순수 확인 인원)`);
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
