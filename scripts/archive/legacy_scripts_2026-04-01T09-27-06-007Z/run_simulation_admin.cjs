const admin = require('firebase-admin');

// 서비스 계정 키 파일이 없다면 환경 변수나 직접 설정을 고려해야 함
// 여기선 로컬 테스트용이므로 프로젝트 ID로 초기화 시도
admin.initializeApp({
    projectId: 'boksaem-yoga'
});

const db = admin.firestore();

async function runSimulation() {
    const startDate = new Date('2026-01-15T10:00:00Z');
    const endDate = new Date('2026-02-03T10:00:00Z');
    const branchId = 'main_branch';

    console.log('--- 시뮬레이션 시작 (Node.js Admin SDK) ---');

    let currentDate = new Date(startDate);
    let totalNewMembers = 0;
    let totalAttendance = 0;

    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        console.log(`\n[${dateStr}] 데이터 생성 중...`);

        const batch = db.batch();

        // 1. 신규 회원 4명 등록용
        for (let i = 0; i < 4; i++) {
            const memberNum = totalNewMembers + 1;
            const phone = `010-9999-${String(memberNum).padStart(4, '0')}`; // 고유 번호 대역 사용
            const name = `테스트회원_${memberNum}`;

            const memberRef = db.collection('members').doc();
            batch.set(memberRef, {
                name,
                phone,
                phoneLast4: phone.slice(-4),
                branchId,
                credits: 20,
                expiryDate: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active',
                createdAt: currentDate.toISOString(),
                updatedAt: currentDate.toISOString()
            });
            totalNewMembers++;
        }

        // 2. 출석 체크 시뮬레이션용 (기존 회원 40명)
        const membersSnap = await db.collection('members').limit(100).get();
        const allMembers = [];
        membersSnap.forEach(doc => allMembers.push({ id: doc.id, ...doc.data() }));

        if (allMembers.length > 0) {
            for (let i = 0; i < 40; i++) {
                const randomMember = allMembers[Math.floor(Math.random() * allMembers.length)];

                const attendanceRef = db.collection('attendance').doc();
                batch.set(attendanceRef, {
                    memberId: randomMember.id,
                    memberName: randomMember.name,
                    timestamp: currentDate.toISOString(),
                    date: dateStr,
                    branchId,
                    className: '요가 수련 (테스트)',
                    instructor: '테스트강사',
                    type: 'auto'
                });

                const memberRef = db.collection('members').doc(randomMember.id);
                batch.update(memberRef, {
                    credits: admin.firestore.FieldValue.increment(-1),
                    attendanceCount: admin.firestore.FieldValue.increment(1),
                    lastAttendance: currentDate.toISOString()
                });

                totalAttendance++;
            }
        }

        await batch.commit();
        currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`\n--- 시뮬레이션 완료 ---`);
    console.log(`총 신규 회원 생성: ${totalNewMembers}명`);
    console.log(`총 출석 건수 생성: ${totalAttendance}건`);
}

runSimulation().catch(err => {
    console.error('시뮬레이션 실패:', err);
    console.log('\n[알림] Google Cloud 인증(Application Default Credentials)이 필요할 수 있습니다.');
    console.log('명령창에 "gcloud auth application-default login"을 실행했는지 확인해 주세요.');
});
