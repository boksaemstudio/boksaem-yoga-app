const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.join(__dirname, 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const TENANT = 'boksaem-yoga';
const today = new Date().toISOString().split('T')[0]; // 2026-03-23

(async () => {
  console.log(`\n=== 📊 전체 시스템 로그 분석 === (${today})\n`);

  // 1. 오늘 출석 로그
  console.log('── 1. 오늘 출석 로그 ──');
  const attSnap = await db.collection(`studios/${TENANT}/attendance`)
    .where('date', '==', today).get();
  let denied = 0, valid = 0, photoMissing = 0, faceMatch = 0;
  const checkins = [];
  attSnap.forEach(d => {
    const r = d.data();
    const time = r.timestamp?.toDate?.()?.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' }) || '?';
    if (r.status === 'denied') denied++;
    else valid++;
    if (!r.photoUrl) photoMissing++;
    if (r.isFacialMatch) faceMatch++;
    checkins.push({ time, name: r.memberName || '?', status: r.status || 'valid', facial: r.isFacialMatch ? '🎯' : '', photo: r.photoUrl ? '📷' : '❌' });
  });
  checkins.sort((a, b) => a.time.localeCompare(b.time));
  checkins.forEach(c => console.log(`  ${c.time} ${c.name.padEnd(6)} ${c.status.padEnd(7)} ${c.facial} ${c.photo}`));
  console.log(`  총 ${attSnap.size}건 (유효 ${valid}, 거절 ${denied}, 사진누락 ${photoMissing}, 안면매칭 ${faceMatch})\n`);

  // 2. 최근 7일 출석 추이
  console.log('── 2. 최근 7일 출석 추이 ──');
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const daySnap = await db.collection(`studios/${TENANT}/attendance`)
      .where('date', '==', dateStr).get();
    let dValid = 0, dDenied = 0;
    daySnap.forEach(doc => { if (doc.data().status === 'denied') dDenied++; else dValid++; });
    const bar = '█'.repeat(Math.min(dValid, 50));
    console.log(`  ${dateStr} | ${String(dValid).padStart(3)}명 ${bar}${dDenied > 0 ? ` (거절 ${dDenied})` : ''}`);
  }
  console.log();

  // 3. 에러 로그
  console.log('── 3. 에러 로그 (최근 20건) ──');
  try {
    const errSnap = await db.collection(`studios/${TENANT}/errorLogs`)
      .orderBy('timestamp', 'desc').limit(20).get();
    if (errSnap.empty) console.log('  에러 로그 없음 ✅');
    else errSnap.forEach(d => {
      const e = d.data();
      const time = e.timestamp?.toDate?.()?.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' }) || '?';
      console.log(`  ${time} ${(e.message || e.error || JSON.stringify(e)).substring(0, 120)}`);
    });
  } catch (e) { console.log('  에러 로그 컬렉션 없음 (정상)'); }
  console.log();

  // 4. AI 인사말 캐시
  console.log('── 4. AI 인사말 캐시 (최근 10건) ──');
  try {
    const aiSnap = await db.collection(`studios/${TENANT}/aiCache`)
      .orderBy('createdAt', 'desc').limit(10).get();
    if (aiSnap.empty) console.log('  AI 캐시 없음');
    else aiSnap.forEach(d => {
      const a = d.data();
      const time = a.createdAt?.toDate?.()?.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' }) || '?';
      console.log(`  ${time} ${d.id.substring(0, 12)} → "${(a.message || '').substring(0, 50)}..."`);
    });
  } catch (e) { console.log('  AI 캐시 없음'); }
  console.log();

  // 5. 회원 현황
  console.log('── 5. 회원 현황 ──');
  const memSnap = await db.collection(`studios/${TENANT}/members`).get();
  let active = 0, expired = 0, noFace = 0, hasFace = 0, totalCredits = 0;
  const todayDate = new Date().toISOString().split('T')[0];
  memSnap.forEach(d => {
    const m = d.data();
    const credits = Number(m.credits || 0);
    const isActive = (!m.endDate && credits > 0) || (m.endDate >= todayDate && credits > 0);
    if (isActive) active++; else expired++;
    if (m.hasFaceDescriptor) hasFace++; else noFace++;
    totalCredits += credits;
  });
  console.log(`  총 ${memSnap.size}명 | 활성 ${active} | 만료 ${expired}`);
  console.log(`  안면등록 ${hasFace}명 | 미등록 ${noFace}명`);
  console.log(`  전체 잔여횟수 합계: ${totalCredits}회\n`);

  // 6. 안면 데이터 현황
  console.log('── 6. 안면 데이터 (face_biometrics) ──');
  const bioSnap = await db.collection(`studios/${TENANT}/face_biometrics`).get();
  let totalDesc = 0, multiDesc = 0;
  bioSnap.forEach(d => {
    const b = d.data();
    const cnt = b.faceDescriptors ? b.faceDescriptors.length : (b.descriptor ? 1 : 0);
    totalDesc += cnt;
    if (cnt > 1) multiDesc++;
  });
  console.log(`  문서 ${bioSnap.size}개 | 디스크립터 총 ${totalDesc}개 | 다중등록 ${multiDesc}명\n`);

  // 7. 동일 번호 회원 분석 (뒤 4자리 충돌)
  console.log('── 7. 동일 번호(뒤4자리) 충돌 회원 ──');
  const phoneMap = {};
  memSnap.forEach(d => {
    const m = d.data();
    if (m.phone) {
      const last4 = m.phone.replace(/[^0-9]/g, '').slice(-4);
      if (!phoneMap[last4]) phoneMap[last4] = [];
      phoneMap[last4].push({ id: d.id, name: m.name, phone: m.phone, hasFace: !!m.hasFaceDescriptor, credits: m.credits, endDate: m.endDate });
    }
  });
  const conflicts = Object.entries(phoneMap).filter(([, v]) => v.length > 1);
  if (conflicts.length === 0) console.log('  충돌 없음 ✅');
  else conflicts.forEach(([last4, members]) => {
    console.log(`  [${last4}] ${members.length}명:`);
    members.forEach(m => {
      const credits = Number(m.credits || 0);
      const isAct = (!m.endDate && credits > 0) || (m.endDate >= todayDate && credits > 0);
      console.log(`    ${m.name.padEnd(6)} | ${m.phone} | 안면:${m.hasFace ? '✅' : '❌'} | ${isAct ? '활성' : '만료'} | 잔여:${credits}회 | 종료:${m.endDate || '-'}`);
    });
  });
  console.log();

  // 8. 스튜디오 설정
  console.log('── 8. 스튜디오 설정 ──');
  const cfgDoc = await db.doc(`studios/${TENANT}/config/settings`).get();
  if (cfgDoc.exists) {
    const c = cfgDoc.data();
    console.log(`  이름: ${c.IDENTITY?.NAME || '?'}`);
    console.log(`  카메라: ${c.POLICIES?.SHOW_CAMERA_PREVIEW ? 'ON' : 'OFF'}`);
    console.log(`  얼굴인식: ${c.POLICIES?.FACE_RECOGNITION_ENABLED ? 'ON' : 'OFF'}`);
    console.log(`  자동닫힘: ${c.POLICIES?.SESSION_AUTO_CLOSE_SEC || '?'}초`);
    console.log(`  카메라크기: ${c.POLICIES?.CAMERA_PREVIEW_SIZE || 'large'}`);
  } else console.log('  설정 없음 ⚠️');
  console.log();

  // 9. 최근 매출 (오늘)
  console.log('── 9. 오늘 매출 ──');
  const salesSnap = await db.collection(`studios/${TENANT}/sales`)
    .where('date', '==', today).get();
  let totalSales = 0;
  salesSnap.forEach(d => { totalSales += Number(d.data().amount || 0); });
  console.log(`  오늘 매출: ${totalSales.toLocaleString()}원 (${salesSnap.size}건)\n`);

  console.log('=== 분석 완료 ===');
  process.exit(0);
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
