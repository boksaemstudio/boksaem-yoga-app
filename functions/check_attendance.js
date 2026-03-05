const admin = require('firebase-admin');

// 프로젝트의 기본 자격 증명 또는 패키지의 admin.initializeApp()을 빈 껍데기로라도 불러오기 위함
// 보통 테스트/스크립트 환경에서는 서비스 계정이 필요하지만, CLI/에뮬레이터 환경에서는 GOOGLE_APPLICATION_CREDENTIALS가 세팅되어 있을 수 있음
// 또는 기존 코드가 firebase-functions 프로젝트이므로 설정값 사용 가능 여부 확인
const { initializeApp, getApps } = require('firebase-admin/app');

if (getApps().length === 0) {
    // 환경에 따라 오류가 날 수 있으므로 예외처리
    try {
        initializeApp();
    } catch(e) {
        console.error("Initialize failed", e);
    }
}

async function checkAttendance() {
    const db = admin.firestore();
    
    // 박영주 회원의 이름으로 조회
    const membersSnap = await db.collection('members').where('name', '==', '박영주').get();
    if (membersSnap.empty) {
        console.log("박영주 회원을 찾을 수 없습니다.");
        return;
    }
    
    // 박영주라는 이름이 여러명일 수 있으니 id 수집
    const ids = membersSnap.docs.map(d => d.id);
    console.log(`박영주 회원 ID 목록:`, ids);
    
    for (const uid of ids) {
        // 어제 (3월 4일) 기록 조회. date 파라미터가 '2026-03-04' 형식인지 확인
        console.log(`--- [ ID: ${uid} ] 출석 기록 조회 ---`);
        const querySnap = await db.collection('attendance')
            .where('memberId', '==', uid)
            .get();
        
        const docs = querySnap.docs.map(d => { return { id: d.id, ...d.data() } });
        
        const targetDocs = docs.filter(d => {
            const dateStr = d.date || (d.timestamp && d.timestamp.substring(0,10));
            return dateStr === '2026-03-04';
        });

        console.log(`2026년 3월 4일 출석 건수: ${targetDocs.length}`);
        targetDocs.forEach(d => {
            console.log(`- ID: ${d.id}, Time: ${d.timestamp}, Session: ${d.className || d.title}, Reason: ${d.logicReason || 'none'}`);
        });
        
        // 추가로 오늘(3/5) 것도 찍어봄
        const todayDocs = docs.filter(d => {
            const dateStr = d.date || (d.timestamp && d.timestamp.substring(0,10));
            return dateStr === '2026-03-05';
        });
        console.log(`2026년 3월 5일 출석 건수: ${todayDocs.length}`);
        todayDocs.forEach(d => {
            console.log(`- ID: ${d.id}, Time: ${d.timestamp}, Session: ${d.className || d.title}, Reason: ${d.logicReason || 'none'}`);
        });
    }
}

checkAttendance().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
