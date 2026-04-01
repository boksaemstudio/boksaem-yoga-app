import { db } from '../src/firebase.js';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, increment } from 'firebase/firestore';

async function runSimulation() {
    const startDate = new Date('2026-01-15T10:00:00Z');
    const endDate = new Date('2026-02-03T10:00:00Z');
    const branchId = 'main_branch'; // 기본 지점 설정

    console.log('--- 시뮬레이션 시작 ---');

    let currentDate = new Date(startDate);
    let totalNewMembers = 0;
    let totalAttendance = 0;

    while (currentDate <= endDate) {
        const dateStr = currentDate.toLocaleDateString('sv-SE');
        console.log(`\n[${dateStr}] 데이터 생성 중...`);

        // 1. 신규 회원 4명 등록
        for (let i = 0; i < 4; i++) {
            const memberNum = totalNewMembers + 1;
            const phone = `010-0000-${String(memberNum).padStart(4, '0')}`;
            const name = `테스트회원_${memberNum}`;

            const memberData = {
                name,
                phone,
                phoneLast4: phone.slice(-4),
                branchId,
                credits: 20, // 20회권 기준
                expiryDate: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 뒤 만료
                status: 'active',
                createdAt: currentDate.toISOString(),
                updatedAt: currentDate.toISOString()
            };

            await addDoc(collection(db, 'members'), memberData);
            totalNewMembers++;
        }

        // 2. 기존 회원 40명 출석 체크 (랜덤하게 40개 생성)
        // 실제 서비스가 아니므로 랜덤 멤버 ID를 가져와서 생성
        const membersSnap = await getDocs(collection(db, 'members'));
        const allMembers = membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (allMembers.length > 0) {
            for (let i = 0; i < 40; i++) {
                const randomMember = allMembers[Math.floor(Math.random() * allMembers.length)];

                // 출석 데이터 생성
                await addDoc(collection(db, 'attendance'), {
                    memberId: randomMember.id,
                    memberName: randomMember.name,
                    timestamp: currentDate.toISOString(),
                    date: dateStr,
                    branchId,
                    className: '요가 수련',
                    instructor: '테스트강사',
                    type: 'auto'
                });

                // 회원 수치 업데이트 (횟수 차감 및 출석 카운트 증가)
                const memberRef = doc(db, 'members', randomMember.id);
                await updateDoc(memberRef, {
                    credits: increment(-1),
                    attendanceCount: increment(1),
                    lastAttendance: currentDate.toISOString()
                });

                totalAttendance++;
            }
        }

        // 다음 날로 이동
        currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`\n--- 시뮬레이션 완료 ---`);
    console.log(`총 신규 회원: ${totalNewMembers}명`);
    console.log(`총 출석 건수: ${totalAttendance}건`);
}

// 주의: 실제 Firestore에 데이터를 쓰게 되므로 실행 전 신중히 검토하세요.
runSimulation().catch(console.error);
