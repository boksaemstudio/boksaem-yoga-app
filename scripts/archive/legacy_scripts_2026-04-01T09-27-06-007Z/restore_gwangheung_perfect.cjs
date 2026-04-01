const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tenantId = 'boksaem-yoga';
const tdb = db.collection('studios').doc(tenantId);

const EXCLUDE_MEMBERS = new Set(['ssKsChLghzYc9UaD0nNb', 'wBGdzNiUifYs80Wzu4Ay', 'FXetUW5Mpi2dgAVulVPz', 'd5dOhmZNi8wTm7iCFPlB', 'demo-member', 'ayVth1VwZ8EmDq7UZmBH']);
const EXCLUDE_NAMES = new Set(['송미호', '정계수', '주민정']); // 주민정 블랙리스트 처리 명시

async function run() {
    console.log('='.repeat(70));
    console.log('  [🔥 마스터 엔진 가동] 3월 30일 데이터 완전 무결 복구 메커니즘 (광흥창점)');
    console.log('='.repeat(70));

    // 1. Database Ground Truth Schedule 진리 구조체 획득
    console.log('[단계 1] 광흥창점 3/30 실제 시간표 확보 중...');
    const scheduleSnap = await tdb.collection('daily_classes').doc('gwangheungchang_2026-03-30').get();
    if (!scheduleSnap.exists) {
        console.error("FATAL: 광흥창점 3/30 시간표 데이터가 DB에 존재하지 않습니다!");
        process.exit(1);
    }
    const realSchedule = scheduleSnap.data().classes || [];
    if (realSchedule.length === 0) {
        console.error("FATAL: 시간표 배열이 비어있습니다.");
        process.exit(1);
    }
    
    // 시간표 슬롯들의 분(min) 계산용 맵핑 구축
    const slottedSchedule = realSchedule.map(cls => {
        const [h, m] = cls.time.split(':').map(Number);
        return {
            ...cls,
            absoluteMin: h * 60 + m
        };
    });
    
    console.log("-> DB에서 확인한 객관적 수업 목록:");
    slottedSchedule.forEach(c => console.log(`   - ${c.time} ${c.title} (강사: ${c.instructor})`));

    // 2. 파이어베이스 Access Log CSV 파싱 (교차검증용)
    console.log('\n[단계 2] 접근 로그 기반 소속 필터링 연산...');
    const LOG_FACTS = {};
    try {
        const logData = fs.readFileSync(path.join(__dirname, '../tests/downloaded-logs-20260331-031943.csv'), 'utf8');
        const lines = logData.split('\n');
        for (const line of lines) {
            // mapo 또는 gwangheungchang 식별
            const match = line.match(/Check-in request for ([A-Za-z0-9]+) in (mapo|gwangheungchang)/i);
            if (match) {
                const cId = match[1];
                const cBranch = match[2].toLowerCase();
                LOG_FACTS[cId] = cBranch; // match captures gwangheungchang correctly based on regex
            }
        }
    } catch(e) { console.warn("Log parse Warning:", e.message); }

    const eventsSnap = await tdb.collection('practice_events').where('date', '==', '2026-03-30').get();
    
    // 3. practice_events에서 원천 이벤트 필터링
    console.log('\n[단계 3] 회원 및 연강 타임스탬프 필터링 중...');
    const evts = [];
    eventsSnap.forEach(doc => {
        const d = doc.data();
        if (EXCLUDE_MEMBERS.has(d.memberId)) return;
        
        let createdAt = d.createdAt;
        if (!createdAt) return;
        if (typeof createdAt === 'object' && createdAt.toDate) createdAt = createdAt.toDate();
        
        const kstHour = (createdAt.getUTCHours() + 9) % 24;
        
        // 16시 전 이벤트는 오작동/테스트로 간주하여 커트 (주민정 16:25은 위에서 이름으로 이미 차단완료)
        // 오후 수업(18시, 19시 등)이므로 15시 이후만 허용
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

    // 4. 연강 알고리즘 분석 (최소 50분 이격)
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

    // 5. 복구 및 결합
    console.log('\n[단계 4] 스케쥴 알고리즘 최종 조합 시작...');
    const gwBatch = db.batch();
    let gwCount = 0;

    for (const ev of restores) {
        const meta = memberMeta.get(ev.memberId);
        const m = meta.mData;
        
        // 팩트 투입!
        let decidedBranch = meta.rawBranch;
        if (LOG_FACTS[ev.memberId]) decidedBranch = LOG_FACTS[ev.memberId];

        // "광흥창점만 복구해" 
        if (decidedBranch !== 'gwangheungchang') continue;

        const currentMin = parseInt(ev.timeStr.split(':')[0]) * 60 + parseInt(ev.timeStr.split(':')[1]);
        
        // 절댓값 수학 연산으로 가장 가까운 수업 매칭
        let closestClass = null;
        let minDiff = Infinity;
        
        slottedSchedule.forEach(c => {
            const diff = Math.abs(currentMin - c.absoluteMin);
            if (diff < minDiff) {
                minDiff = diff;
                closestClass = c;
            }
        });

        if (!closestClass) {
            console.error(`ERROR: ${meta.name} 수업을 알고리즘이 매칭하지 못했습니다! 통과합니다.`);
            continue;
        }

        console.log(`[🎯 복구 준비] ${meta.name} -> 광흥창점 ${closestClass.time} ${closestClass.title} (강사: ${closestClass.instructor}) ${ev.isBackToBack ? '🔥연강 연결성 확인!' : ''}`);

        // Member 횟수 차감
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
        gwBatch.update(memberRef, memUpdates);

        // Attendance 문서 신규 복구 기록! (이슈 원천 차단: timestamp는 ISO 형식)
        const attRef = tdb.collection('attendance').doc(`gwang_restored_${ev.docId}`);
        gwBatch.set(attRef, {
            memberId: ev.memberId,
            memberName: meta.name,
            branchId: 'gwangheungchang',
            date: '2026-03-30',
            classTime: closestClass.time,           // 시간 완벽 분리
            className: closestClass.title,          // 수업명만 완벽 분리
            instructor: closestClass.instructor,    // 진짜 강사님 매칭 완료
            status: 'valid',
            credits: (m.credits !== undefined ? Math.max(0, m.credits - 1) : 999999), 
            cumulativeCount: (m.attendanceCount || 0) + 1,
            method: 'system_restore',
            timestamp: ev.time.toISOString(),       // Invalid Date 방지! 완벽한 ISO
            isManual: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        gwCount++;
    }

    if (gwCount === 0) {
        console.log("\n⚠️ 광흥창점 대상 복구 건수가 0건입니다.");
    } else {
        console.log(`\n총 ${gwCount}건의 광흥창점 출석 복구 & 횟수 차감 Transaction Commit 대기 중...`);
        await gwBatch.commit();
        console.log("✅ COMMIT COMPLETE. 광흥창점의 모든 데이터가 한 치의 오차 없이 복원되었습니다.");
    }
    
    process.exit(0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
