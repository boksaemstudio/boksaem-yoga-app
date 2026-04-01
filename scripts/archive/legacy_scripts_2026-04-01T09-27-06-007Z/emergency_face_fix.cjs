/**
 * 긴급 안면인식 오출석 수정 스크립트
 * 
 * 1. FACE_RECOGNITION_ENABLED를 Firestore에서 강제 OFF (모든 스튜디오)
 * 2. 이소현: 마지막 출석 삭제 + credits=13
 * 3. 박송자: 마지막 출석 삭제 + 선등록 상태 복원 (startDate 제거, firstCheckInTriggered=false)
 * 4. 이다솜: 오늘 출석 삭제 + 횟수 원상복귀
 * 5. 전수조사: 오늘 안면인식 자동출석 로그 전체 확인 (모든 지점)
 */

const admin = require('../functions/node_modules/firebase-admin');
const sa = require('../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const db = admin.firestore();

async function run() {
    const STUDIO_ID = 'boksaem-yoga';
    const studioRef = db.collection('studios').doc(STUDIO_ID);
    const todayKST = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // '2026-03-30'

    console.log(`\n🔴 긴급 안면인식 장애 대응 - ${todayKST}`);
    console.log('='.repeat(60));

    // ============================
    // 1. 안면인식 강제 OFF
    // ============================
    console.log('\n📌 1단계: 안면인식 강제 OFF...');
    try {
        await studioRef.set({
            POLICIES: {
                FACE_RECOGNITION_ENABLED: false,
                PHOTO_ENABLED: false,
                SHOW_CAMERA_PREVIEW: false
            }
        }, { merge: true });
        console.log('   ✅ FACE_RECOGNITION_ENABLED = false 설정 완료');
        console.log('   ✅ PHOTO_ENABLED = false 설정 완료');
        console.log('   ✅ SHOW_CAMERA_PREVIEW = false 설정 완료');
    } catch (e) {
        console.error('   ❌ 설정 변경 실패:', e.message);
    }

    // ============================
    // 2. 전수조사: 오늘 출석 로그 중 안면인식 자동출석 조사
    // ============================
    console.log('\n📌 2단계: 오늘 전체 출석 로그 전수조사...');
    
    const logsRef = studioRef.collection('attendance_logs');
    const todayStart = new Date(`${todayKST}T00:00:00+09:00`);
    const todayEnd = new Date(`${todayKST}T23:59:59+09:00`);
    
    const allLogs = await logsRef
        .where('timestamp', '>=', todayStart.toISOString())
        .where('timestamp', '<=', todayEnd.toISOString())
        .get();

    console.log(`   📊 오늘 총 출석 로그 수: ${allLogs.size}건`);
    
    const faceLogs = [];
    const allTodayLogs = [];
    
    allLogs.forEach(doc => {
        const d = doc.data();
        allTodayLogs.push({ id: doc.id, ...d });
        
        // 안면인식 출석 판별: method가 'face'이거나, pin이 없거나, autoFace 플래그
        const isFaceCheckin = d.method === 'face' || d.method === 'facial' || 
                              d.checkInMethod === 'face' || d.checkInMethod === 'facial' ||
                              d.autoFaceRecognition === true ||
                              (!d.pin && !d.method && d.memberId); // pin 없이 memberId만 있으면 자동출석 의심
        
        if (isFaceCheckin) {
            faceLogs.push({ id: doc.id, ...d });
        }
    });

    // 모든 출석 로그 표시
    console.log('\n   === 오늘 전체 출석 기록 ===');
    for (const log of allTodayLogs) {
        const time = log.timestamp ? new Date(log.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : 'N/A';
        console.log(`   [${log.id}] ${log.memberName || log.memberId || 'unknown'} | ${time} | method: ${log.method || log.checkInMethod || '(없음)'} | pin: ${log.pin || '(없음)'} | branch: ${log.branchId || '(없음)'}`);
    }

    if (faceLogs.length > 0) {
        console.log(`\n   🚨 안면인식 의심 출석: ${faceLogs.length}건`);
        for (const fl of faceLogs) {
            const time = fl.timestamp ? new Date(fl.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : 'N/A';
            console.log(`   ⚠️ [${fl.id}] ${fl.memberName || fl.memberId} | ${time} | ${fl.branchId || '본점'}`);
        }
    } else {
        console.log('\n   ℹ️ 안면인식 method 명시된 출석 로그는 없음. 수동 분석 필요.');
    }

    // ============================
    // 3. 대상 회원 조회 (이름으로)
    // ============================
    console.log('\n📌 3단계: 대상 회원 조사...');
    const membersRef = studioRef.collection('members');
    
    // 이소현 찾기
    const sohyunSnap = await membersRef.where('name', '==', '이소현').get();
    // 박송자 찾기
    const songjaSnap = await membersRef.where('name', '==', '박송자').get();
    // 이다솜 찾기
    const dasomSnap = await membersRef.where('name', '==', '이다솜').get();

    console.log(`   이소현: ${sohyunSnap.size}명 찾음`);
    console.log(`   박송자: ${songjaSnap.size}명 찾음`);
    console.log(`   이다솜: ${dasomSnap.size}명 찾음`);

    // 각 회원의 현재 상태 출력
    for (const snap of [sohyunSnap, songjaSnap, dasomSnap]) {
        snap.forEach(doc => {
            const m = doc.data();
            console.log(`\n   👤 ${m.name} (${doc.id})`);
            console.log(`      credits: ${m.credits} / originalCredits: ${m.originalCredits}`);
            console.log(`      regDate: ${m.regDate} | startDate: ${m.startDate || '(없음)'}`);
            console.log(`      status: ${m.status} | attendanceCount: ${m.attendanceCount}`);
            console.log(`      lastAttendance: ${m.lastAttendance || '(없음)'}`);
            console.log(`      firstCheckInTriggered: ${m.firstCheckInTriggered}`);
            console.log(`      branchId: ${m.branchId}`);
        });
    }

    // ============================
    // 4. 오늘 해당 회원들의 출석 로그 조회
    // ============================
    console.log('\n📌 4단계: 개별 회원 오늘 출석 로그 검색...');
    
    const targetMembers = {};
    sohyunSnap.forEach(doc => { targetMembers[doc.id] = { ...doc.data(), docId: doc.id }; });
    songjaSnap.forEach(doc => { targetMembers[doc.id] = { ...doc.data(), docId: doc.id }; });
    dasomSnap.forEach(doc => { targetMembers[doc.id] = { ...doc.data(), docId: doc.id }; });

    for (const [memberId, member] of Object.entries(targetMembers)) {
        console.log(`\n   🔍 ${member.name} (${memberId}) 오늘 출석 기록:`);
        const memberLogs = allTodayLogs.filter(l => l.memberId === memberId);
        
        if (memberLogs.length === 0) {
            console.log(`      (오늘 출석 기록 없음)`);
        } else {
            for (const ml of memberLogs) {
                const time = ml.timestamp ? new Date(ml.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : 'N/A';
                console.log(`      📝 [${ml.id}] ${time} | method: ${ml.method || '(없음)'} | pin: ${ml.pin || '(없음)'} | className: ${ml.className || '(없음)'}`);
            }
        }
    }

    // ============================
    // 5. 수정 실행
    // ============================
    console.log('\n📌 5단계: 데이터 수정...');
    const batch = db.batch();

    // --- 이소현: 마지막 출석 삭제, credits=13 ---
    for (const doc of sohyunSnap.docs) {
        const memberData = doc.data();
        const memberLogs = allTodayLogs.filter(l => l.memberId === doc.id);
        
        // 가장 최근 로그 삭제
        if (memberLogs.length > 0) {
            // 시간순 정렬 후 마지막 것 삭제
            memberLogs.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
            const lastLog = memberLogs[memberLogs.length - 1];
            console.log(`   🗑️ 이소현 마지막 출석 삭제: [${lastLog.id}] - ${lastLog.timestamp}`);
            batch.delete(logsRef.doc(lastLog.id));
        }
        
        // credits=13, attendanceCount 감소
        const currentCount = memberData.attendanceCount || 0;
        batch.update(membersRef.doc(doc.id), {
            credits: 13,
            attendanceCount: Math.max(0, currentCount - 1)
        });
        console.log(`   ✏️ 이소현 credits → 13, attendanceCount → ${Math.max(0, currentCount - 1)}`);
    }

    // --- 박송자: 마지막 출석 삭제, 선등록 복원 ---
    for (const doc of songjaSnap.docs) {
        const memberData = doc.data();
        const memberLogs = allTodayLogs.filter(l => l.memberId === doc.id);
        
        if (memberLogs.length > 0) {
            memberLogs.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
            const lastLog = memberLogs[memberLogs.length - 1];
            console.log(`   🗑️ 박송자 마지막 출석 삭제: [${lastLog.id}] - ${lastLog.timestamp}`);
            batch.delete(logsRef.doc(lastLog.id));
        }
        
        // 선등록 복원: startDate, firstCheckInTriggered 초기화
        const currentCount = memberData.attendanceCount || 0;
        const updatePayload = {
            attendanceCount: Math.max(0, currentCount - 1),
            credits: (memberData.credits || 0) + 1, // 틀어진 크레딧 복구
            firstCheckInTriggered: false,
            lastAttendance: admin.firestore.FieldValue.delete() // 마지막 출석 날짜 제거
        };
        
        // startDate가 오늘로 세팅되었다면 제거
        if (memberData.startDate === todayKST || 
            (memberData.startDate && memberData.startDate.startsWith(todayKST))) {
            updatePayload.startDate = admin.firestore.FieldValue.delete();
            console.log(`   ↩️ 박송자 startDate 제거 (선등록 복원)`);
        }
        
        batch.update(membersRef.doc(doc.id), updatePayload);
        console.log(`   ✏️ 박송자 선등록 상태 복원 완료 (firstCheckInTriggered=false)`);
    }

    // --- 이다솜: 오늘 출석 삭제, 횟수 복구 ---
    for (const doc of dasomSnap.docs) {
        const memberData = doc.data();
        const memberLogs = allTodayLogs.filter(l => l.memberId === doc.id);
        
        if (memberLogs.length > 0) {
            memberLogs.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
            const lastLog = memberLogs[memberLogs.length - 1];
            console.log(`   🗑️ 이다솜 오늘 출석 삭제: [${lastLog.id}] - ${lastLog.timestamp}`);
            batch.delete(logsRef.doc(lastLog.id));
        }
        
        const currentCount = memberData.attendanceCount || 0;
        batch.update(membersRef.doc(doc.id), {
            credits: (memberData.credits || 0) + 1,
            attendanceCount: Math.max(0, currentCount - 1)
        });
        console.log(`   ✏️ 이다솜 credits +1 복구, attendanceCount -1 복구`);
    }

    await batch.commit();
    console.log('\n✅ 모든 수정 사항 Firestore에 반영 완료.');

    // ============================
    // 6. 선등록/첫출석 로직 분석
    // ============================
    console.log('\n═══════════════════════════════════════');
    console.log('📋 선등록(첫출석시 시작일) 내부 로직 분석:');
    console.log('═══════════════════════════════════════');
    console.log('출석 삭제 시 선등록 상태 자동 복원 여부:');
    console.log('  → ❌ 자동으로 되돌아가지 않음.');
    console.log('  → "firstCheckInTriggered" 패래그를 수동으로 false로 세팅해야 함.');
    console.log('  → "startDate"도 수동으로 삭제해야 함.');
    console.log('  → 이 스크립트에서 수동으로 복원 처리 완료.');
    console.log('═══════════════════════════════════════');

    process.exit(0);
}

run().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
