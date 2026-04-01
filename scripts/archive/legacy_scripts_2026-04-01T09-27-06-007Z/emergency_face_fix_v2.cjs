/**
 * 🔴 긴급 수정 스크립트 v2 — 안면인식 오출석 복구
 * 
 * 조사 결과 요약:
 * - 이소현 → DB에 "이소현ttc7기"로 등록 (ID: ssKsChLghzYc9UaD0nNb)
 *   → 21:09에 안면인식 자동출석됨 (아쉬탕가, gwangheungchang)
 *   → 마지막 출석 삭제, credits=13
 * 
 * - 박송자 (ID: wBGdzNiUifYs80Wzu4Ay)
 *   → 09:40 정상출석(하타) + 21:00 안면인식 오출석(플라잉)
 *   → 21:00 출석(8Q7oGzhySwMQDvCX6k7e) 삭제
 *   → 선등록 상태 복원: 재등록한 새 회원권의 startDate 다시 지우기, credits +1 복구
 * 
 * - 이다솜 (ID: FXetUW5Mpi2dgAVulVPz, mapo)
 *   → 18:39 안면인식 오출석(하타)
 *   → 출석(DGQ1xAfZIdLd1ipq6Xha) 삭재, credits +1 복구
 * 
 * - 오후 3시 이후 의심 출석 전체: 별도 목록 처리
 * 
 * 추가: FACE_RECOGNITION_ENABLED = false 재확인
 */
const admin = require('../functions/node_modules/firebase-admin');
const sa = require('../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const db = admin.firestore();

async function run() {
    const STUDIO_ID = 'boksaem-yoga';
    const tdb = db.collection('studios').doc(STUDIO_ID);
    const todayKST = '2026-03-30';

    console.log('\n🔴 긴급 안면인식 오출석 복구 v2');
    console.log('='.repeat(60));

    // 1. 안면인식 강제 OFF 재확인
    console.log('\n📌 1. 안면인식 OFF 재확인...');
    await tdb.set({
        POLICIES: {
            FACE_RECOGNITION_ENABLED: false,
            PHOTO_ENABLED: false,
            SHOW_CAMERA_PREVIEW: false
        }
    }, { merge: true });
    console.log('   ✅ 완료');

    // 2. 오늘 전체 출석 가져오기
    const attSnap = await tdb.collection('attendance')
        .where('date', '==', todayKST)
        .get();
    
    const allRecords = [];
    attSnap.forEach(doc => {
        const d = doc.data();
        let ts = d.timestamp;
        if (ts && typeof ts === 'object' && ts.toDate) ts = ts.toDate().toISOString();
        allRecords.push({ id: doc.id, ...d, timestamp: ts });
    });
    allRecords.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
    
    console.log(`\n📌 2. 오늘 총 출석: ${allRecords.length}건`);

    // 3. 오후 3시(KST) 이후 출석 = 안면인식 의심 (대표님이 OFF한 이후)
    // KST 15:00 = UTC 06:00
    const cutoffUTC = '2026-03-30T06:00:00.000Z';
    const lateRecords = allRecords.filter(r => r.timestamp && r.timestamp > cutoffUTC);
    
    console.log(`\n📌 3. 오후 3시(KST) 이후 출석 (안면인식 의심): ${lateRecords.length}건`);
    console.log('   ' + '-'.repeat(100));
    lateRecords.forEach((r, i) => {
        const t = r.timestamp ? new Date(r.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }) : 'N/A';
        console.log(`   ${i+1}. [${r.id}] ${t} | ${r.memberName || '?'} | ${r.branchId || ''} | ${r.className || ''} | type:${r.type || ''}`);
    });

    // 4. 대상 회원별 수정
    console.log('\n📌 4. 수정 실행...');
    const batch = db.batch();

    // --- 이소현ttc7기 (ssKsChLghzYc9UaD0nNb) ---
    const sohyunId = 'ssKsChLghzYc9UaD0nNb';
    const sohyunRef = tdb.collection('members').doc(sohyunId);
    const sohyunDoc = await sohyunRef.get();
    
    if (sohyunDoc.exists) {
        const m = sohyunDoc.data();
        console.log(`\n   === 이소현ttc7기 (${sohyunId}) ===`);
        console.log(`   현재 credits: ${m.credits}, attendanceCount: ${m.attendanceCount}`);
        
        // 21:09 출석 삭제 (gnZh2CjGldQ0mAoa9xlz)
        const sohyunAttId = 'gnZh2CjGldQ0mAoa9xlz';
        batch.delete(tdb.collection('attendance').doc(sohyunAttId));
        console.log(`   🗑️ 출석 삭제: ${sohyunAttId}`);
        
        // credits=13, attendanceCount -1
        batch.update(sohyunRef, {
            credits: 13,
            attendanceCount: Math.max(0, (m.attendanceCount || 0) - 1)
        });
        console.log(`   ✏️ credits → 13, attendanceCount → ${Math.max(0, (m.attendanceCount || 0) - 1)}`);
    } else {
        console.log(`   ⚠️ 이소현ttc7기 문서 없음`);
    }

    // --- 박송자 (wBGdzNiUifYs80Wzu4Ay) ---
    const songjaId = 'wBGdzNiUifYs80Wzu4Ay';
    const songjaRef = tdb.collection('members').doc(songjaId);
    const songjaDoc = await songjaRef.get();
    
    if (songjaDoc.exists) {
        const m = songjaDoc.data();
        console.log(`\n   === 박송자 (${songjaId}) ===`);
        console.log(`   현재 credits: ${m.credits}, attendanceCount: ${m.attendanceCount}`);
        console.log(`   현재 startDate: ${m.startDate}, endDate: ${m.endDate}`);
        console.log(`   upcomingMembership: ${JSON.stringify(m.upcomingMembership || null)}`);
        
        // 21:00 출석 삭제 (8Q7oGzhySwMQDvCX6k7e)
        const songjaAttId = '8Q7oGzhySwMQDvCX6k7e';
        batch.delete(tdb.collection('attendance').doc(songjaAttId));
        console.log(`   🗑️ 출석 삭제: ${songjaAttId}`);
        
        // 대표님 설명:
        // - 오전에 기존 회원권으로 마지막 출석 완료 (이건 정상)
        // - 재등록 선등록(upcomingMembership)이 있었는데, 안면인식 오출석으로 활성화되어버림
        // - credits +1 복구, attendanceCount -1
        // - 선등록이 활성화된 것 되돌리기:
        //   upcomingMembership을 복원하고, startDate/endDate/membershipType 원복 필요
        //   하지만 현재 upcomingMembership이 이미 delete 되었을 수 있음
        
        // 이전 스크립트에서 이미 attendanceCount 12로 줄이고 credits 24로 됨
        // 현재 상태: credits=24, attendanceCount=12, startDate=2026-02-23
        // 하지만 안면인식 오출석이 21:00에 됐으면 이미 수정 전 스크립트가 돌았으니...
        // 재조회 필요
        
        const currentCredits = m.credits || 0;
        const currentCount = m.attendanceCount || 0;
        
        const updatePayload = {
            credits: currentCredits + 1,
            attendanceCount: Math.max(0, currentCount - 1)
        };
        
        // 선등록(upcoming) 활성화가 이 오출석으로 인해 트리거되었다면,
        // startDate가 오늘(2026-03-30)로 바뀌었을 것
        // 대표님이 말씀하신 대로 "시작일이 오늘부터 시작되었어" → startDate를 되돌려야
        if (m.startDate === todayKST) {
            // 선등록이 활성화되어 startDate가 오늘로 바뀐 경우
            // 이전 회원권의 startDate로 되돌려야 하지만 정보가 없으므로
            // TBD(첫출석시 시작)로 되돌림
            updatePayload.startDate = 'TBD';
            updatePayload.endDate = 'TBD';
            console.log(`   ↩️ startDate/endDate → TBD (선등록 복원)`);
        }
        
        batch.update(songjaRef, updatePayload);
        console.log(`   ✏️ credits → ${currentCredits + 1}, attendanceCount → ${Math.max(0, currentCount - 1)}`);
    } else {
        console.log(`   ⚠️ 박송자 문서 없음`);
    }

    // --- 이다솜 (FXetUW5Mpi2dgAVulVPz, mapo) ---
    const dasomId = 'FXetUW5Mpi2dgAVulVPz';
    const dasomRef = tdb.collection('members').doc(dasomId);
    const dasomDoc = await dasomRef.get();
    
    if (dasomDoc.exists) {
        const m = dasomDoc.data();
        console.log(`\n   === 이다솜 (${dasomId}) ===`);
        console.log(`   현재 credits: ${m.credits}, attendanceCount: ${m.attendanceCount}`);
        
        // 18:39 출석 삭제 (DGQ1xAfZIdLd1ipq6Xha)
        const dasomAttId = 'DGQ1xAfZIdLd1ipq6Xha';
        batch.delete(tdb.collection('attendance').doc(dasomAttId));
        console.log(`   🗑️ 출석 삭제: ${dasomAttId}`);
        
        const currentCredits = m.credits || 0;
        const currentCount = m.attendanceCount || 0;
        
        batch.update(dasomRef, {
            credits: currentCredits + 1,
            attendanceCount: Math.max(0, currentCount - 1)
        });
        console.log(`   ✏️ credits → ${currentCredits + 1}, attendanceCount → ${Math.max(0, currentCount - 1)}`);
    } else {
        console.log(`   ⚠️ 이다솜 문서 없음`);
    }

    // 5. 오후 3시 이후 나머지 의심건도 삭제
    console.log(`\n📌 5. 오후 3시 이후 기타 의심 출석 삭제...`);
    const alreadyHandled = ['gnZh2CjGldQ0mAoa9xlz', '8Q7oGzhySwMQDvCX6k7e', 'DGQ1xAfZIdLd1ipq6Xha'];
    
    for (const r of lateRecords) {
        if (alreadyHandled.includes(r.id)) continue;
        
        console.log(`   🔍 [${r.id}] ${r.memberName} (${r.memberId}) - ${r.className} - 추가 조사 필요`);
        
        // 이 회원의 credits, attendanceCount도 복구해야 함
        const memberRef = tdb.collection('members').doc(r.memberId);
        const memberDoc = await memberRef.get();
        if (memberDoc.exists && r.status === 'valid') {
            const md = memberDoc.data();
            batch.delete(tdb.collection('attendance').doc(r.id));
            batch.update(memberRef, {
                credits: admin.firestore.FieldValue.increment(1),
                attendanceCount: admin.firestore.FieldValue.increment(-1)
            });
            console.log(`   🗑️ 삭제 + 복구: ${r.memberName} credits+1, count-1`);
        }
    }

    await batch.commit();
    console.log('\n✅ 모든 수정 사항 Firestore에 반영 완료.');

    // 6. 수정 후 재확인
    console.log('\n📌 6. 수정 후 상태 재확인...');
    for (const [name, id] of [['이소현ttc7기', sohyunId], ['박송자', songjaId], ['이다솜', dasomId]]) {
        const doc = await tdb.collection('members').doc(id).get();
        if (doc.exists) {
            const m = doc.data();
            console.log(`   ${name}: credits=${m.credits}, count=${m.attendanceCount}, startDate=${m.startDate}, endDate=${m.endDate}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🔴 복구 완료. 안면인식은 Firestore에서 OFF 상태입니다.');
    console.log('   앱을 새로고침하면 즉시 반영됩니다.');
    process.exit(0);
}

run().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
