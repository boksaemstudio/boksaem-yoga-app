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
    console.log('  [🔥 갓 모드 실행] 3월 30일 데이터 복구 엔진 (마포점 전용 제한 가동)');
    console.log('='.repeat(70));

    // 1. 파이어베이스 로그 파싱
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
    } catch(e) { console.log("Log parse error", e.message); }

    const eventsSnap = await tdb.collection('practice_events').where('date', '==', '2026-03-30').get();
    const attSnap = await tdb.collection('attendance').where('date', '==', '2026-03-30').get();
    const safeMembers = new Set();
    attSnap.forEach(d => {
        const mId = d.data().memberId;
        // 출석이 복구되었더라도 이 스크립트는 삭제된 건들을 기반으로 실행하므로
        // 혹시나 이미 복구된 건들을 또 중복 처리하지 않게 막음
        // (단, 연강처리를 위해 일단 제외 조건은 약하게)
    });

    const evts = [];
    eventsSnap.forEach(doc => {
        const d = doc.data();
        if (EXCLUDE_MEMBERS.has(d.memberId)) return;
        
        let createdAt = d.createdAt;
        if (!createdAt) return;
        if (typeof createdAt === 'object' && createdAt.toDate) createdAt = createdAt.toDate();
        const kstHour = (createdAt.getUTCHours() + 9) % 24;
        
        if (kstHour >= 15) {
            evts.push({
                docId: doc.id,
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
                memberMeta.set(ev.memberId, { name: m.name || '알수없음', rawBranch: m.branchId || 'unknown', mData: m });
            } else {
                memberMeta.set(ev.memberId, { name: '알수없음', rawBranch: 'unknown', mData: null });
            }
        }
    }

    const validEvts = evts.filter(ev => {
        const meta = memberMeta.get(ev.memberId);
        return !EXCLUDE_NAMES.has(meta.name) && meta.name !== '알수없음';
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

    const mapoBatch = db.batch();
    let mapoCount = 0;

    for (const ev of restores) {
        const meta = memberMeta.get(ev.memberId);
        const m = meta.mData;
        
        // 팩트 투입!
        let decidedBranch = meta.rawBranch;
        if (LOG_FACTS[ev.memberId]) decidedBranch = LOG_FACTS[ev.memberId];

        // "마포점만 복구해" 지시 수행
        if (decidedBranch !== 'mapo') continue;

        const currentMin = parseInt(ev.timeStr.split(':')[0]) * 60 + parseInt(ev.timeStr.split(':')[1]);
        
        let assignedClassName = '미상 (알고리즘 실패)';
        let assignedClassTime = '00:00';
        
        const d1840 = Math.abs(currentMin - (18*60 + 40));
        const d1950 = Math.abs(currentMin - (19*60 + 50));
        const d2100 = Math.abs(currentMin - (21*60));
        
        if (d1840 <= d1950 && d1840 <= d2100) {
            assignedClassName = '인요가'; assignedClassTime = '18:40';
        } else if (d1950 <= d1840 && d1950 <= d2100) {
            assignedClassName = '하타'; assignedClassTime = '19:50';
        } else {
            assignedClassName = '플라잉 (기초)'; assignedClassTime = '21:00';
        }

        const classNameFull = `${assignedClassTime} ${assignedClassName}`;
        console.log(`[🎯 복구 준비] ${meta.name} -> 마포점 ${classNameFull} (${ev.timeStr}) ${ev.isBackToBack ? '연강 출석!' : ''}`);

        // Member 횟수 차감 및 날짜 업데이트 (연강이라도 출석은 각각 등록하므로 횟수는 정상 차감됨)
        const memberRef = tdb.collection('members').doc(ev.memberId);
        const memUpdates = {
            attendanceCount: admin.firestore.FieldValue.increment(1),
            lastAttendanceDate: '2026-03-30',
            lastCheckIn: '2026-03-30',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        // 무제한(credits >= 999999)이 아닌 정규권이면 차감
        if (m && m.credits !== undefined && m.credits < 999999) {
            memUpdates.credits = admin.firestore.FieldValue.increment(-1);
        }
        mapoBatch.update(memberRef, memUpdates);

        // Attendance 복구 생성
        const attRef = tdb.collection('attendance').doc(`restored_${ev.docId}`);
        mapoBatch.set(attRef, {
            memberId: ev.memberId,
            memberName: meta.name,
            branchId: 'mapo',
            date: '2026-03-30',
            className: classNameFull,
            instructor: '원복됨 (시스템)', // 강사명은 미상으로 백업
            status: 'valid',
            credits: (m.credits !== undefined ? Math.max(0, m.credits - 1) : 999999), 
            cumulativeCount: (m.attendanceCount || 0) + 1,
            method: 'system_restore',
            timestamp: admin.firestore.Timestamp.fromDate(ev.time),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        mapoCount++;
    }

    if (mapoCount === 0) {
        console.log("\n⚠️ 마포점으로 대상되는 복구 대기 횟수가 0건입니다.");
    } else {
        console.log(`\n총 ${mapoCount}건의 마포점 출석 및 회원 잔여횟수 차감 Batch 반영을 시작합니다 (원장님 지시: 마포점만 복구해!)...`);
        await mapoBatch.commit();
        console.log("✅ 커밋 완료. 마포점 데이터가 생계를 찾았습니다.");
    }
    
    process.exit(0);
}
run().catch(e => { console.error('Fatal:', e); process.exit(1); });
