/**
 * 삭제된 3/30 오후 출석 회원 역추적 스크립트
 * 
 * 복구 벡터:
 *   1. 3/30 저녁 수업 스케줄에서 어떤 수업이 있었는지 확인
 *   2. Cloud Functions 로그(stdout)에서 checkIn 호출 흔적 추적
 *   3. 회원 문서에서 lastAttendanceDate = '2026-03-30'인데 출석 기록이 없는 회원 탐색
 *   4. 3/30 출석 기록 중 현존하는 것과 대조
 */
const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tenantId = 'boksaem-yoga';
const tdb = db.collection('studios').doc(tenantId);

async function run() {
    console.log('=' .repeat(70));
    console.log('  3/30 오후 삭제 회원 역추적 보고서');
    console.log('='.repeat(70));

    // 1. 3/30 수업 스케줄 확인 (모든 지점)
    console.log('\n[1] 3/30 일요일 수업 스케줄 조회...');
    const branches = ['gwangheungchang', 'mapo', 'mullae'];
    for (const br of branches) {
        const docId = `${br}_2026-03-30`;
        const snap = await tdb.collection('daily_classes').doc(docId).get();
        if (snap.exists) {
            const d = snap.data();
            const classes = d.classes || [];
            if (classes.length > 0) {
                console.log(`\n  📅 ${br} — ${classes.length}개 수업:`);
                classes.forEach(c => {
                    const h = parseInt((c.time || '00:00').split(':')[0]);
                    const marker = h >= 15 ? '🔴 오후' : '    오전';
                    console.log(`    ${marker} ${c.time} ${c.title} (${c.instructor || '?'}) ${c.status || ''}`);
                });
            }
        }
    }

    // 2. 현존하는 3/30 출석 기록
    console.log('\n[2] 현존하는 3/30 출석 기록...');
    const attSnap = await tdb.collection('attendance').where('date', '==', '2026-03-30').get();
    const existingMembers = new Set();
    const existingRecords = [];
    attSnap.forEach(doc => {
        const d = doc.data();
        existingMembers.add(d.memberId);
        let ts = d.timestamp;
        if (ts && typeof ts === 'object' && ts.toDate) ts = ts.toDate().toISOString();
        const kst = ts ? new Date(ts).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }) : 'N/A';
        existingRecords.push({ id: doc.id, name: d.memberName, memberId: d.memberId, time: kst, className: d.className, status: d.status, branchId: d.branchId });
    });
    console.log(`  현존 기록: ${existingRecords.length}건`);
    existingRecords.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    existingRecords.forEach((r, i) => {
        console.log(`    ${i + 1}. ${r.time} | ${r.name} | ${r.className} | ${r.status} | ${r.branchId}`);
    });

    // 3. 핵심 복구: 모든 회원 스캔 — lastAttendanceDate가 3/30인데 출석기록이 없는 회원
    console.log('\n[3] 핵심 역추적: 회원 문서에서 3/30 흔적 탐색...');
    const allMembers = await tdb.collection('members').get();
    const suspects = [];
    const trace330 = [];

    allMembers.forEach(doc => {
        const m = doc.data();
        if (m.deletedAt) return; // soft-deleted 제외
        
        const hasAttRecord = existingMembers.has(doc.id);
        
        // lastAttendanceDate or lastCheckIn이 3/30인 회원
        const lastAtt = m.lastAttendanceDate || m.lastCheckIn || '';
        if (lastAtt === '2026-03-30') {
            trace330.push({
                id: doc.id,
                name: m.name,
                credits: m.credits,
                count: m.attendanceCount,
                lastAtt,
                branchId: m.branchId,
                hasRecord: hasAttRecord,
                membershipType: m.membershipType,
                endDate: m.endDate
            });
            
            if (!hasAttRecord) {
                suspects.push({
                    id: doc.id,
                    name: m.name,
                    credits: m.credits,
                    count: m.attendanceCount,
                    lastAtt,
                    branchId: m.branchId,
                    membershipType: m.membershipType,
                    endDate: m.endDate
                });
            }
        }
    });

    console.log(`\n  lastAttendanceDate='2026-03-30' 인 회원: ${trace330.length}명`);
    trace330.forEach(m => {
        const status = m.hasRecord ? '✅ 출석기록 있음' : '🔴 출석기록 없음 → 삭제된 것으로 추정';
        console.log(`    ${m.name} (${m.id}) | ${m.branchId} | credits=${m.credits} count=${m.count} | ${status}`);
    });

    if (suspects.length > 0) {
        console.log(`\n  ⚠️ 삭제 추정 회원: ${suspects.length}명`);
        console.log('  ─'.repeat(40));
        suspects.forEach(s => {
            console.log(`    🔴 ${s.name} | ${s.branchId} | credits=${s.credits} count=${s.count} | 유형=${s.membershipType || '?'} 만료=${s.endDate || '?'}`);
        });
    } else {
        console.log('\n  ℹ️ lastAttendanceDate 기반으로는 삭제 추정 회원 없음');
    }

    // 4. 추가 벡터: updatedAt이 emergency 스크립트 실행 시간(3/30 오후~밤)인 회원
    console.log('\n[4] 추가 벡터: 3/30에 credits가 수정된 회원 탐색...');
    // emergency 스크립트가 FieldValue.increment(1)을 사용했으므로 updatedAt이 찍혔을 수 있음
    const updateCandidates = [];
    allMembers.forEach(doc => {
        const m = doc.data();
        if (m.deletedAt) return;
        
        let updatedAt = m.updatedAt;
        if (updatedAt && typeof updatedAt === 'object' && updatedAt.toDate) {
            updatedAt = updatedAt.toDate().toISOString();
        }
        
        if (updatedAt && typeof updatedAt === 'string') {
            // 3/30 KST 12:00 ~ 3/31 KST 06:00 사이 (UTC 03:00 ~ 21:00)
            if (updatedAt > '2026-03-30T03:00:00' && updatedAt < '2026-03-30T21:00:00') {
                if (!existingMembers.has(doc.id)) {
                    updateCandidates.push({
                        id: doc.id,
                        name: m.name,
                        credits: m.credits,
                        count: m.attendanceCount,
                        branchId: m.branchId,
                        updatedAt,
                        lastAtt: m.lastAttendanceDate
                    });
                }
            }
        }
    });
    
    if (updateCandidates.length > 0) {
        console.log(`  3/30에 수정되었지만 출석기록 없는 회원: ${updateCandidates.length}명`);
        updateCandidates.forEach(c => {
            console.log(`    📝 ${c.name} (${c.id}) | ${c.branchId} | credits=${c.credits} count=${c.count} | updated=${c.updatedAt} | lastAtt=${c.lastAtt}`);
        });
    }

    // 5. emergency 스크립트에 하드코딩된 3명의 현재 상태
    console.log('\n[5] 스크립트 명시 회원 3명 현재 상태...');
    const named = [
        ['이소현ttc7기', 'ssKsChLghzYc9UaD0nNb'],
        ['박송자', 'wBGdzNiUifYs80Wzu4Ay'],
        ['이다솜', 'FXetUW5Mpi2dgAVulVPz']
    ];
    for (const [name, id] of named) {
        const doc = await tdb.collection('members').doc(id).get();
        if (doc.exists) {
            const m = doc.data();
            console.log(`  ${name}: credits=${m.credits} count=${m.attendanceCount} start=${m.startDate} end=${m.endDate} lastAtt=${m.lastAttendanceDate || 'N/A'} branch=${m.branchId}`);
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('  보고서 끝');
    console.log('='.repeat(70));
    process.exit(0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
