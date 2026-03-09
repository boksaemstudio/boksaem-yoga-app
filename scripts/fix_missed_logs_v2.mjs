import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';

let serviceAccount;
try {
  const accountPath = 'C:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app\\service-account.json';
  if (existsSync(accountPath)) {
    serviceAccount = JSON.parse(readFileSync(accountPath, 'utf8'));
  } else {
    serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
  }
} catch (e) {
  console.error("Error loading service account. Make sure service-account.json exists in root.", e);
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// 타겟 회원 정보
const targets = [
  { name: '최인해', lastFour: '6100' },
  { name: '김호정', lastFour: '7067' },
  { name: '허향무', lastFour: '0204' },
  { name: '황선영ttc7기', lastFour: '9574' } // 혹은 황선영
];

async function fixMissedLogs() {
  console.log("=== 시작: 누락된 출석 추가 및 횟수 차감 ===\n");
  
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  const logIdsAdded = [];

  for (const t of targets) {
    console.log(`[처리중] ${t.name} (${t.lastFour}) 검색...`);
    
    // 회원 검색 (이름과 전화번호 뒷자리로 필터링)
    // 혹은 이름으로만 검색 후 뒷자리 확인
    const membersRef = db.collection('members');
    let nameToSearch = t.name;
    // 황선영의 경우 뒷자리가 9574인 사람 찾기
    const snapshot = await membersRef.where('name', '>=', nameToSearch).where('name', '<=', nameToSearch + '\uf8ff').get();
    
    let targetMember = null;
    let targetId = null;

    if (!snapshot.empty) {
       for (const doc of snapshot.docs) {
           const data = doc.data();
           let isMatch = false;
           // 전화번호가 존재하고 뒷자리가 일치하는 경우
           if (data.phone && data.phone.endsWith(t.lastFour)) {
               isMatch = true;
           } else if (t.lastFour === '9574' && data.name.includes('황선영')) {
               // 황선영 예외처리 (이름에 ttc7기가 붙어있는 경우 대비)
               if (data.phone && data.phone.endsWith('9574')) isMatch = true;
           } else if (t.lastFour === '6100' && data.phone && data.phone.endsWith('6100')) {
               isMatch = true;
           } else if (t.lastFour === '7067' && data.phone && data.phone.endsWith('7067')) {
               isMatch = true;
           } else if (t.lastFour === '0204' && data.phone && data.phone.endsWith('0204')) {
               isMatch = true;
           }

           if (isMatch) {
               targetMember = data;
               targetId = doc.id;
               break;
           }
       }
    }

    if (!targetMember) {
        // 이름 정확히 일치로 한번 더 시도
        const rawSnap = await membersRef.get();
        for(let doc of rawSnap.docs) {
            const d = doc.data();
            if(d.name.includes(t.name.replace('ttc7기','')) && d.phone && d.phone.endsWith(t.lastFour)) {
                targetMember = d;
                targetId = doc.id;
                break;
            }
        }
    }


    if (!targetMember) {
        console.log(`❌ 회원을 찾을 수 없음: ${t.name} (${t.lastFour})`);
        continue;
    }

    console.log(`✅ 회원 찾음: ID ${targetId}, 현재 남은 횟수: ${targetMember.credits}`);

    // 오늘 출석 로그가 있는지 확인 (중복 방지)
    const logsRef = db.collection('attendance_logs');
    const existingLogSnap = await logsRef
        .where('memberId', '==', targetId)
        .where('date', '==', todayStr)
        .where('status', '==', 'checkin')
        .get();

    if (!existingLogSnap.empty) {
        console.log(`⚠️  이미 오늘(${todayStr}) 출석 기록이 존재합니다. 생략합니다.\n`);
        continue;
    }

    const currentCredits = Number(targetMember.credits) || 0;
    const newCredits = Math.max(0, currentCredits - 1);
    
    // 로그 생성
    const newLogRef = logsRef.doc();
    const batch = db.batch();

    const timestamp = new Date();
    
    const logData = {
        memberId: targetId,
        memberName: targetMember.name,
        branchId: targetMember.homeBranch || '본점',
        timestamp: timestamp,
        date: todayStr,
        type: 'checkin',
        status: 'checkin',
        className: '수동 보정',
        instructor: '관리자',
        credits: newCredits,
        isManual: true,
        note: '누락된 출석 수동 추가'
    };

    batch.set(newLogRef, logData);

    // 멤버 횟수 차감 및 출석 데이터 업데이트
    const memberUpdate = {
        credits: newCredits,
        attendanceCount: FieldValue.increment(1),
        lastAttendance: todayStr,
        updatedAt: FieldValue.serverTimestamp()
    };

    batch.update(membersRef.doc(targetId), memberUpdate);

    // 실행
    try {
        await batch.commit();
        console.log(`🎉 [완료] 출석 기록 추가 (로그 ID: ${newLogRef.id})`);
        console.log(`   잔여 횟수 변경: ${currentCredits} -> ${newCredits}\n`);
    } catch(err) {
        console.error(`❌ [오류] ${t.name} 업데이트 실패:`, err);
    }
  }
  
  console.log("=== 모든 처리가 완료되었습니다 ===");
}

fixMissedLogs().catch(console.error);
