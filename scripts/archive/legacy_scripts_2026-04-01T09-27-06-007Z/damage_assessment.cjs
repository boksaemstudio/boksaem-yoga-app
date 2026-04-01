/**
 * 긴급 조사: emergency_face_fix_v2.cjs가 삭제한 기록 복원을 위한 근거 수집
 * 
 * 전략:
 * 1. 삭제된 출석 기록 자체는 하드삭제되어 DB에 없음
 * 2. 하지만 회원들의 attendanceCount와 credits가 역보정(+1, -1)되었으므로
 *    오늘 출석했으나 삭제된 회원을 역추적할 수 있음
 * 3. 또한 emergency_face_fix_v2.cjs의 로직을 분석하면 
 *    "오후 3시 이후" 기준으로 삭제했으므로, 
 *    오늘 "마이솔" 등 오후 수업 중 3시 이후 기록이 삭제되었을 가능성
 * 4. 살아남은 21건의 기록과 비교하여 누락된 회원 파악
 */
const admin = require('../functions/node_modules/firebase-admin');
const sa = require('../functions/service-account-key.json');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const db = admin.firestore();

async function run() {
    const STUDIO_ID = 'boksaem-yoga';
    const tdb = db.collection('studios').doc(STUDIO_ID);
    
    let out = '=== emergency_face_fix_v2.cjs 피해 분석 보고서 ===\n\n';
    
    // 1. 현재 살아있는 오늘 출석 기록
    const todayStart = '2026-03-30T00:00:00Z';
    const todayEnd = '2026-03-30T23:59:59Z';
    
    const aliveSnap = await tdb.collection('attendance')
        .where('timestamp', '>=', todayStart)
        .where('timestamp', '<=', todayEnd)
        .get();
    
    // 회원 이름 캐시
    const membersSnap = await tdb.collection('members').get();
    const nameMap = {};
    const memberDataMap = {};
    membersSnap.forEach(doc => { 
        nameMap[doc.id] = doc.data().name || 'UNKNOWN';
        memberDataMap[doc.id] = doc.data();
    });
    
    // 살아남은 기록의 회원 ID 목록
    const aliveMemberIds = new Set();
    const aliveRecords = [];
    aliveSnap.forEach(doc => {
        const d = doc.data();
        aliveMemberIds.add(d.memberId);
        aliveRecords.push({
            id: doc.id,
            memberId: d.memberId,
            name: nameMap[d.memberId] || d.memberName || 'UNKNOWN',
            time: d.timestamp,
            className: d.className || '',
            status: d.status || 'valid'
        });
    });
    aliveRecords.sort((a,b) => a.time.localeCompare(b.time));
    
    out += `살아있는 오늘 기록: ${aliveRecords.length}건\n`;
    aliveRecords.forEach((r, i) => {
        const kst = new Date(r.time).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
        out += `  ${i+1}. ${kst} | ${r.name} | ${r.className} | ${r.status}\n`;
    });
    
    // 2. emergency_face_fix_v2.cjs의 로직 분석
    // 이 스크립트는 date=='2026-03-30' 조건으로 조회한 후,
    // timestamp > '2026-03-30T06:00:00.000Z' (=KST 15:00) 이후 기록을 모두 삭제했음
    // 단, 이미 처리한 3건(gnZh~, 8Q7o~, DGQ1~)을 제외하고
    // lateRecords에서 status=valid인 것들을 batch.delete + credits +1, count -1 처리
    
    out += '\n=== 삭제 기준 분석 ===\n';
    out += 'emergency_face_fix_v2.cjs 삭제 기준:\n';
    out += '  - date == "2026-03-30" 인 출석 중\n';
    out += '  - timestamp > "2026-03-30T06:00:00.000Z" (KST 15:00) 이후 전부\n';
    out += '  - 이소현, 박송자, 이다솜 3명은 개별 처리 후\n';
    out += '  - 나머지는 무차별 batch.delete() (하드삭제)\n';
    out += '  - 삭제되면서 해당 회원의 credits +1, attendanceCount -1 도 같이 적용\n';
    
    // 3. 살아남은 기록 중 KST 15시 이후 기록 확인
    // UTC 06:00 = KST 15:00
    const after3pmAlive = aliveRecords.filter(r => r.time > '2026-03-30T06:00:00.000Z');
    out += `\nKST 15시 이후 살아남은 기록: ${after3pmAlive.length}건\n`;
    after3pmAlive.forEach(r => {
        const kst = new Date(r.time).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
        out += `  ${kst} | ${r.name} | ${r.className}\n`;
    });
    
    // 4. 스크립트가 date 필드로 조회했는데, timestamp 필드와 date 필드가 다를 수 있음
    // date 필드 기반으로도 한번 더 조회
    const byDateSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .get();
    
    out += `\ndate=='2026-03-30' 으로 조회한 기록: ${byDateSnap.size}건\n`;
    const byDateRecords = [];
    byDateSnap.forEach(doc => {
        const d = doc.data();
        byDateRecords.push({
            id: doc.id,
            memberId: d.memberId,
            name: nameMap[d.memberId] || d.memberName || 'UNKNOWN',
            time: d.timestamp,
            className: d.className || '',
            status: d.status || 'valid'
        });
    });
    byDateRecords.sort((a,b) => {
        const ta = typeof a.time === 'string' ? a.time : '';
        const tb = typeof b.time === 'string' ? b.time : '';
        return ta.localeCompare(tb);
    });
    byDateRecords.forEach((r, i) => {
        const kst = r.time ? new Date(r.time).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }) : 'N/A';
        out += `  ${i+1}. ${kst} | ${r.name} | ${r.className} | ${r.status}\n`;
    });
    
    // 5. 3시 이후 스케줄 확인 - 오늘 저녁 수업이 있었나?
    const schedulesSnap = await tdb.collection('schedules').get();
    out += '\n=== 오늘 스케줄(수업 시간표) 확인 ===\n';
    
    // 2026-03-30 is what day? Let's check
    const dayOfWeek = new Date('2026-03-30').getDay(); // 0=Sun, 1=Mon...
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    out += `오늘 요일: ${dayNames[dayOfWeek]}요일\n`;
    
    schedulesSnap.forEach(doc => {
        const d = doc.data();
        if (d.dayOfWeek === dayOfWeek || d.day === dayNames[dayOfWeek]) {
            const startTime = d.startTime || d.time || '';
            out += `  ${d.className || d.name || doc.id} | ${startTime} | ${d.branchId || ''} | ${d.instructor || ''}\n`;
        }
    });
    
    // 6. 하드삭제된 기록은 복구 불가능하므로, 수동 복원이 필요한 회원 목록 추정
    // attendanceCount 필드가 변경되었을 가능성이 있는 회원들
    out += '\n=== 결론 및 복구 필요 사항 ===\n';
    out += '하드삭제(batch.delete)된 출석 기록은 Firestore에서 완전히 소멸되어 DB에서 복구 불가능합니다.\n';
    out += '복구 방법:\n';
    out += '  1. 원장님의 육안 기억 또는 CRM 대조를 통해 저녁 수업 참석자 명단을 확인\n';
    out += '  2. 확인된 회원에 대해 수동으로 출석 기록을 재생성\n';
    out += '  3. credits와 attendanceCount를 원래 값으로 재조정\n';
    
    fs.writeFileSync(path.join(__dirname, 'damage_report.txt'), out);
    console.log('피해 분석 완료. scripts/damage_report.txt 에 기록됨');
}

run().then(() => process.exit(0)).catch(e => { console.error('Fatal:', e); process.exit(1); });
