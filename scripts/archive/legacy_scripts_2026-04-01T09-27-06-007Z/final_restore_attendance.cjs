/**
 * 최종 삭제 회원 출석 복구 스크립트
 * - practice_events에서 파악된 KST 15:00 이후 출석자 중
 * - 안면인식 오작동 대상자 3명 제외
 * - 원장님 지시: 송미호, 정계수 추가 제외
 * - 잔여 횟수(-1), 출석 카운트(+1) 재조정 및 attendance 복원
 */
const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tenantId = 'boksaem-yoga';
const tdb = db.collection('studios').doc(tenantId);

// 안면인식 오출석자 및 잘못된 데이터 제외 블랙리스트
const EXCLUDED_IDS = new Set([
    'ssKsChLghzYc9UaD0nNb', // 이소현ttc7기
    'wBGdzNiUifYs80Wzu4Ay', // 박송자
    'FXetUW5Mpi2dgAVulVPz', // 이다솜
    'd5dOhmZNi8wTm7iCFPlB', // 복샘요가원 (테스트용)
    'demo-member'
]);

const EXCLUDED_NAMES = new Set(['송미호', '정계수']);

async function run() {
    console.log('='.repeat(70));
    console.log('  ⚠️ 최종 출석 복구 작업 시작 (블랙리스트 최신화) ⚠️');
    console.log('='.repeat(70));

    // 1. practice_events 추출
    const eventsSnap = await tdb.collection('practice_events')
        .where('date', '==', '2026-03-30')
        .get();
    
    // 현존 출석 ID (중복 피함)
    const attSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .get();
    const existingAttIds = new Set();
    attSnap.forEach(doc => existingAttIds.add(doc.id));

    const restoreTargets = new Map();
    
    eventsSnap.forEach(doc => {
        if (existingAttIds.has(doc.id)) return;
        
        const d = doc.data();
        let createdAt = d.createdAt;
        if (!createdAt) return;
        if (typeof createdAt === 'object' && createdAt.toDate) createdAt = createdAt.toDate();
        
        const utcHour = createdAt.getUTCHours();
        const kstHour = (utcHour + 9) % 24;
        if (kstHour < 15) return; 
        
        const memberId = d.memberId;
        if (EXCLUDED_IDS.has(memberId)) return;

        if (!restoreTargets.has(memberId) || createdAt < restoreTargets.get(memberId).time) {
            restoreTargets.set(memberId, { docId: doc.id, data: d, time: createdAt });
        }
    });

    console.log(`\n  ✅ 시스템 필터링: 블랙리스트 대상 필터링 중...`);

    const finalTargets = [];
    for (const [memberId, target] of restoreTargets) {
        const mSnap = await tdb.collection('members').doc(memberId).get();
        if (!mSnap.exists) continue;
        const m = mSnap.data();
        
        // 이름으로 원장님 추가 지시 필터링
        if (m.name && EXCLUDED_NAMES.has(m.name)) {
            console.log(`    ❌ 제외됨 (원장님 지시): ${m.name}`);
            continue;
        }
        
        finalTargets.push({ memberId, target, memberData: m });
    }

    if (finalTargets.length === 0) {
        console.log('\n  ⚠️ 복구할 대상이 없습니다.');
        process.exit(0);
    }

    console.log(`\n  🔄 송미호, 정계수를 제외한 총 ${finalTargets.length}명의 회원 출석 데이터 복구를 실행합니다.`);

    const batch = db.batch();
    let count = 0;

    for (const item of finalTargets) {
        const { memberId, target, memberData: m } = item;
        count++;
        const kstTimeStr = target.time.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
        console.log(`    [${count}] ${m.name} | ${m.branchId || '미상'} | ${kstTimeStr}`);

        const memberRef = tdb.collection('members').doc(memberId);
        const updates = {
            attendanceCount: admin.firestore.FieldValue.increment(1),
            lastAttendanceDate: '2026-03-30',
            lastCheckIn: '2026-03-30',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        // 무제한(credits >= 999999)이 아닌 경우만 차감
        if (m.credits !== undefined && m.credits < 999999) {
            updates.credits = admin.firestore.FieldValue.increment(-1);
        }
        batch.update(memberRef, updates);

        const attRef = tdb.collection('attendance').doc(target.docId);
        batch.set(attRef, {
            memberId,
            memberName: m.name || '알수없음',
            branchId: m.branchId || 'unknown',
            date: '2026-03-30',
            className: '복구된 수업 (수정요망)',
            instructor: '복구됨',
            status: 'valid',
            credits: (m.credits !== undefined ? m.credits - 1 : 999999),
            cumulativeCount: (m.attendanceCount || 0) + 1,
            method: 'system_restore',
            timestamp: admin.firestore.Timestamp.fromDate(target.time),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    console.log(`\n  💾 데이터베이스 일괄 반영(Commit) 중...`);
    await batch.commit();
    console.log(`  🎉 완벽하게 복구되었습니다! 회원 ${count}명의 횟수가 차감되고, 기록이 원상복귀 되었습니다.`);
    
    process.exit(0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
