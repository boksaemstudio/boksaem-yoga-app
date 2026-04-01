import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, updateDoc, doc, getDocs, query, where, increment, serverTimestamp } from "firebase/firestore";
import dotenv from 'dotenv';
dotenv.config();

// Frontend Firebase config for simple browser-like operation via Node.js
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 타겟 회원 정보
const targets = [
  { name: '최인해', lastFour: '6100' },
  { name: '김호정', lastFour: '7067' },
  { name: '허향무', lastFour: '0204' },
  { name: '황선영', lastFour: '9574' }, // 황선영ttc7기 일 수도 있음
  { name: '황선영ttc7기', lastFour: '9574' } 
];

async function fixMissedLogs() {
  console.log("=== 시작: 누락된 출석 추가 및 횟수 차감 ===\n");
  
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  
  const membersRef = collection(db, 'members');
  const logsRef = collection(db, 'attendance_logs');

  for (const t of targets) {
    console.log(`[처리중] 이름: ${t.name}, 전화번호 뒷자리: ${t.lastFour} 검색 중...`);
    
    // 이전에 처리된 황선영이 중복으로 나오는 것을 방지하기 위해
    if (t.name === '황선영ttc7기' && targets.find(x => x.name === '황선영').processed) {
        continue;
    }
    if (t.name === '황선영' && targets.find(x => x.name === '황선영ttc7기').processed) {
        continue;
    }

    let targetId = null;
    let targetData = null;

    // 이름으로 쿼리
    const q1 = query(membersRef, where('name', '==', t.name));
    const snap1 = await getDocs(q1);
    
    if (!snap1.empty) {
        for (const docSnap of snap1.docs) {
            const data = docSnap.data();
            if (data.phone && data.phone.endsWith(t.lastFour)) {
                targetId = docSnap.id;
                targetData = data;
                break;
            }
        }
    }

    // 못찾았으면 부분 일치로 혹시 모를 회원 조회
    if (!targetId) {
        console.log(`  이름 정확 일치 실패. 전체 회원에서 전화번호 및 부분 이름 매칭 중...`);
        const allMembers = await getDocs(membersRef);
        for(const docSnap of allMembers.docs) {
            const data = docSnap.data();
            if (data.phone && data.phone.endsWith(t.lastFour) && data.name.includes(t.name.replace('ttc7기',''))) {
                targetId = docSnap.id;
                targetData = data;
                break;
            }
        }
    }

    if (!targetId) {
        console.log(`❌ 회원을 찾을 수 없음: ${t.name} (${t.lastFour})\n`);
        continue;
    }
    
    // 황선영 처리 표시
    if (t.name.includes('황선영')) {
        targets.find(x => x.name === '황선영').processed = true;
        targets.find(x => x.name === '황선영ttc7기').processed = true;
    }

    console.log(`✅ 회원 찾음: ID ${targetId}, 이름: ${targetData.name}, 전화번호: ${targetData.phone}, 남은 횟수: ${targetData.credits}`);

    // 오늘 출석 로그 중복 확인
    const logQuery = query(
        logsRef, 
        where('memberId', '==', targetId), 
        where('date', '==', todayStr),
        where('status', '==', 'checkin')
    );
    const logSnap = await getDocs(logQuery);

    if (!logSnap.empty) {
        console.log(`⚠️ 이미 오늘(${todayStr}) 출석 기록이 존재합니다. 생략합니다.\n`);
        continue;
    }

    // 차감
    const currentCredits = Number(targetData.credits) || 0;
    const newCredits = Math.max(0, currentCredits - 1);
    
    try {
        // 출석 로그 추가
        console.log(`  > 출석 기록 생성 중...`);
        const newLogRef = await addDoc(logsRef, {
            memberId: targetId,
            memberName: targetData.name,
            branchId: targetData.homeBranch || '본점',
            timestamp: serverTimestamp(),
            date: todayStr,
            type: 'checkin',
            status: 'checkin',
            className: '수동 보정',
            instructor: '관리자',
            credits: newCredits,
            isManual: true,
            note: '누락된 출석 수동 추가'
        });

        // 회원 정보 업데이트
        console.log(`  > 회원 정보 업데이트 중 (횟수 차감)...`);
        const memberDocRef = doc(db, 'members', targetId);
        await updateDoc(memberDocRef, {
            credits: newCredits,
            attendanceCount: increment(1),
            lastAttendance: todayStr,
            updatedAt: serverTimestamp()
        });

        console.log(`🎉 [완료] 출석 기록 추가 (로그 ID: ${newLogRef.id})`);
        console.log(`   잔여 횟수 변경: ${currentCredits} -> ${newCredits}\n`);

    } catch (err) {
        console.error(`❌ [오류] 처리 중 에러 발생:`, err);
    }
  }

  console.log("=== 모든 처리가 완료되었습니다 ===");
  process.exit(0);
}

fixMissedLogs().catch(err => {
    console.error("전체 에러:", err);
    process.exit(1);
});
