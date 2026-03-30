const admin = require('firebase-admin');

// Firebase Admin 초기화 (라이브 DB 접근)
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log('--- 🚀 출석 삭제 시 자동 롤백 기능 테스트 시작 ---');
    
    // 1. 가상 회원 생성 (선등록 TBD 대기 상태)
    const testMemberId = 'test_member_rollback';
    const memberRef = db.collection('tenants').doc('boksaem-yoga').collection('members').doc(testMemberId);
    
    await memberRef.set({
        name: '롤백테스트회원',
        phone: '010-9999-9999',
        branchId: 'M1', // 마포점
        credits: 0,
        attendanceCount: 0,
        startDate: null,
        endDate: null,
        membershipType: null,
        upcomingMembership: {
            membershipType: '선등록 수강권',
            credits: 20,
            duration: 90,
            startDate: 'TBD'
        },
        isActive: true,
        createdAt: new Date().toISOString()
    });
    
    console.log('✅ [1] 가상 회원 생성 완료 (선등록 상태)');

    // 2. 출석(CheckIn) API 호출을 통해 개시 발생시킴
    // Functions (checkInMemberV2Call) URL
    const url = 'https://asia-northeast3-boksaem-yoga.cloudfunctions.net/checkInMemberV2Call';
    
    console.log('⏳ [2] 수강권 개시 (출석 API 호출 중...)');
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            data: {
                memberId: testMemberId,
                branchId: 'M1',
                classTitle: '롤백 테스트 요가',
                instructor: '봇강사'
            }
        })
    });
    
    const result = await response.json();
    
    if(!result.result || !result.result.success) {
        console.error('❌ 출석 API 실패:', result);
        return;
    }
    
    console.log('✅ [2] 출석 API 성공 -> 수강권 개시됨');
    const attendanceId = result.result.attendanceId;
    
    // 3. 상태 확인 (블랙박스 확인)
    const attSnap = await db.collection('tenants').doc('boksaem-yoga').collection('attendance').doc(attendanceId).get();
    const attData = attSnap.data();
    
    console.log('🔍 [3] 출석 데이터 검증');
    if(attData.stateChanges) {
        console.log('✅ 블랙박스(stateChanges) 생성됨:', attData.stateChanges);
    } else {
        console.error('❌ 블랙박스(stateChanges) 누락됨!');
    }
    
    const memSnapAfter = await memberRef.get();
    console.log('🔍 회원 상태(개시 후):', {
        credits: memSnapAfter.data().credits,
        startDate: memSnapAfter.data().startDate,
        upcomingMembership: memSnapAfter.data().upcomingMembership || '없음'
    });
    
    // 4. 출석 소프트 삭제 수행 (프론트엔드 attendanceService.deleteAttendance 로직을 똑같이 구현)
    // 실제로는 클라이언트가 batch.update로 호출합니다.
    console.log('⏳ [4] 관리자 출석 삭제 흉내내기 (롤백 진입)');
    
    const batch = db.batch();
    const logData = attData;
    
    let updates = {
        credits: admin.firestore.FieldValue.increment(logData.sessionCount || 1),
        attendanceCount: admin.firestore.FieldValue.increment(-(logData.sessionCount || 1))
    };
    
    if (logData.stateChanges) {
        const prev = logData.stateChanges;
        console.log('🛠 블랙박스 해금하여 회원 상태 롤백 적용');
        updates.credits = prev.credits !== undefined ? prev.credits : admin.firestore.FieldValue.increment(logData.sessionCount || 1);
        updates.membershipType = prev.membershipType === null ? admin.firestore.FieldValue.delete() : prev.membershipType;
        updates.startDate = prev.startDate === null ? admin.firestore.FieldValue.delete() : prev.startDate;
        updates.endDate = prev.endDate === null ? admin.firestore.FieldValue.delete() : prev.endDate;
        updates.upcomingMembership = prev.upcomingMembership === null ? admin.firestore.FieldValue.delete() : prev.upcomingMembership;
    }
    
    batch.update(memberRef, updates);
    batch.update(attSnap.ref, { deletedAt: new Date().toISOString(), _deletedBy: 'admin_test' });
    
    await batch.commit();
    console.log('✅ [4] 로컬 삭제 트랜잭션 적용 (롤백 수행됨!)');
    
    // 5. 최종 회원 상태 확인
    const memSnapFinal = await memberRef.get();
    console.log('🎉 [5] 최종 롤백 결과 확인:', {
        credits: memSnapFinal.data().credits,
        startDate: memSnapFinal.data().startDate || '없음',
        upcomingMembership: memSnapFinal.data().upcomingMembership || '없음'
    });
    
    // 정리
    await memberRef.delete();
    await attSnap.ref.delete();
    console.log('--- 🧹 테스트 완료 (가상 데이터 삭제됨) ---');
}

runTest().catch(console.error);
