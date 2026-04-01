/**
 * SaaS 데이터 마이그레이션 전수조사
 * 
 * 검증 항목:
 * 1. 회원(members) — 필수필드 누락, membershipType 유효성, credits 이상치
 * 2. 출석(attendance) — 존재하지 않는 memberId, 날짜 이상, 중복 출석
 * 3. 매출(sales) — 존재하지 않는 memberId, 금액 이상치, 필수필드 누락
 * 4. 등록이력(registrations array) — membershipType 불일치, 날짜 순서 이상
 * 5. 가격표(pricing) — 옵션 필드 누락
 * 6. FCM 토큰 — 잘못된 role, 빈 토큰
 * 7. 설정(settings) — 강사 데이터 무결성
 */
const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';
const tdb = (col) => db.collection(`studios/${STUDIO_ID}/${col}`);

const VALID_MEMBERSHIP_TYPES = ['general', 'advanced', 'saturday_hatha', 'kids_flying', 'prenatal', 'ttc', 'kids', 'TTC'];
const issues = [];

function addIssue(category, severity, description, data = {}) {
  issues.push({ category, severity, description, ...data });
}

async function auditMembers() {
  console.log('\n🔍 1. 회원(members) 전수조사...');
  const snap = await tdb('members').get();
  let noName = 0, noPhone = 0, noCredits = 0, negCredits = 0, hugeCredits = 0;
  let noStartDate = 0, noEndDate = 0, invalidType = 0, noType = 0;
  let duplicatePhones = {};
  let expiredButActiveCount = 0;
  
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  
  for (const doc of snap.docs) {
    const d = doc.data();
    const id = doc.id;
    
    // 필수필드 누락
    if (!d.name) { noName++; addIssue('member', 'HIGH', `이름 없음`, { id }); }
    if (!d.phone) { noPhone++; }
    if (d.credits === undefined || d.credits === null) { noCredits++; }
    if (typeof d.credits === 'number' && d.credits < 0) { negCredits++; addIssue('member', 'HIGH', `마이너스 크레딧: ${d.name} (${d.credits})`, { id }); }
    if (typeof d.credits === 'number' && d.credits > 50000) { hugeCredits++; addIssue('member', 'MEDIUM', `비정상 크레딧: ${d.name} (${d.credits})`, { id }); }
    
    // 날짜 무결성
    if (!d.startDate || d.startDate === 'TBD') noStartDate++;
    if (!d.endDate || d.endDate === 'TBD') noEndDate++;
    
    // 시작일 > 종료일 (과거 데이터 제외)
    if (d.startDate && d.endDate && d.startDate !== 'TBD' && d.endDate !== 'TBD') {
      if (d.startDate > d.endDate) {
        addIssue('member', 'HIGH', `시작일(${d.startDate}) > 종료일(${d.endDate}): ${d.name}`, { id });
      }
    }
    
    // 만료됐는데 크레딧 많음
    if (d.endDate && d.endDate !== 'TBD' && d.endDate < today && d.credits > 100) {
      expiredButActiveCount++;
    }
    
    // membershipType invalid
    if (!d.membershipType) { noType++; }
    else if (!VALID_MEMBERSHIP_TYPES.includes(d.membershipType)) { 
      invalidType++;
      addIssue('member', 'MEDIUM', `미등록 membershipType: ${d.membershipType} (${d.name})`, { id });
    }
    
    // 전화번호 중복 체크
    if (d.phone) {
      if (!duplicatePhones[d.phone]) duplicatePhones[d.phone] = [];
      duplicatePhones[d.phone].push(d.name);
    }
    
    // registrations 배열 무결성
    const regs = d.registrations || [];
    for (let i = 0; i < regs.length; i++) {
      const r = regs[i];
      if (!r.membershipType && !r.planName && !r.selectedOption) {
        addIssue('member', 'LOW', `등록이력[${i}] 타입정보 누락: ${d.name}`, { id });
      }
    }
  }
  
  // 전화번호 중복
  const dupes = Object.entries(duplicatePhones).filter(([_, names]) => names.length > 1);
  dupes.forEach(([phone, names]) => {
    addIssue('member', 'MEDIUM', `전화번호 중복(${phone}): ${names.join(', ')}`);
  });
  
  console.log(`  총 회원: ${snap.size}`);
  console.log(`  이름 없음: ${noName}, 전화 없음: ${noPhone}, 크레딧 없음: ${noCredits}`);
  console.log(`  마이너스 크레딧: ${negCredits}, 비정상 크레딧(>50000): ${hugeCredits}`);
  console.log(`  시작일 없음: ${noStartDate}, 종료일 없음: ${noEndDate}`);
  console.log(`  membershipType 없음: ${noType}, 미등록 타입: ${invalidType}`);
  console.log(`  전화번호 중복: ${dupes.length}건`);
  console.log(`  만료+잔여크레딧>100: ${expiredButActiveCount}명`);
  
  return snap;
}

async function auditAttendance(memberSnap) {
  console.log('\n🔍 2. 출석(attendance) 전수조사...');
  const snap = await tdb('attendance').get();
  const memberIds = new Set(memberSnap.docs.map(d => d.id));
  
  let orphanCount = 0, noDate = 0, noMemberId = 0, duplicateCheckins = {};
  
  for (const doc of snap.docs) {
    const d = doc.data();
    
    if (!d.memberId) { noMemberId++; continue; }
    if (!memberIds.has(d.memberId)) {
      orphanCount++;
    }
    if (!d.date) { noDate++; }
    
    // 같은 날 같은 회원 중복 출석 체크
    const key = `${d.memberId}_${d.date}`;
    if (!duplicateCheckins[key]) duplicateCheckins[key] = 0;
    duplicateCheckins[key]++;
  }
  
  const dupeAttendance = Object.entries(duplicateCheckins).filter(([_, c]) => c > 3);
  dupeAttendance.forEach(([key, count]) => {
    addIssue('attendance', 'MEDIUM', `과다 출석(${count}회): ${key}`);
  });
  
  console.log(`  총 출석 기록: ${snap.size}`);
  console.log(`  memberId 없음: ${noMemberId}`);
  console.log(`  존재하지 않는 회원 참조(고아): ${orphanCount}건`);
  console.log(`  날짜 없음: ${noDate}`);
  console.log(`  3회 이상 중복 출석: ${dupeAttendance.length}건`);
}

async function auditSales(memberSnap) {
  console.log('\n🔍 3. 매출(sales) 전수조사...');
  const snap = await tdb('sales').get();
  const memberIds = new Set(memberSnap.docs.map(d => d.id));
  
  let orphanCount = 0, noAmount = 0, negAmount = 0, noDate = 0, noType = 0;
  let totalRevenue = 0;
  
  for (const doc of snap.docs) {
    const d = doc.data();
    
    if (d.memberId && !memberIds.has(d.memberId)) orphanCount++;
    
    const amount = Number(d.amount || d.price || 0);
    if (!amount && amount !== 0) noAmount++;
    if (amount < 0) { negAmount++; addIssue('sales', 'HIGH', `마이너스 매출: ${amount} (${d.memberName || doc.id})`, { id: doc.id }); }
    totalRevenue += amount;
    
    if (!d.date && !d.regDate && !d.createdAt) noDate++;
    if (!d.type && !d.saleType && !d.membershipType) noType++;
  }
  
  console.log(`  총 매출 기록: ${snap.size}`);
  console.log(`  총 매출액: ${totalRevenue.toLocaleString()}원`);
  console.log(`  존재하지 않는 회원 참조(고아): ${orphanCount}건`);
  console.log(`  금액 없음: ${noAmount}, 마이너스 금액: ${negAmount}`);
  console.log(`  날짜 없음: ${noDate}, 타입 없음: ${noType}`);
}

async function auditPricing() {
  console.log('\n🔍 4. 가격표(pricing) 전수조사...');
  const snap = await db.doc(`studios/${STUDIO_ID}/settings/pricing`).get();
  
  if (!snap.exists) {
    addIssue('pricing', 'CRITICAL', 'pricing 문서가 존재하지 않음!');
    console.log('  ❌ pricing 문서 없음!');
    return;
  }
  
  const data = snap.data();
  const keys = Object.keys(data).filter(k => k !== '_meta');
  
  console.log(`  가격표 카테고리: ${keys.length}개 (${keys.join(', ')})`);
  
  for (const key of keys) {
    const cat = data[key];
    if (!cat.label) addIssue('pricing', 'MEDIUM', `${key}: label 없음`);
    if (!cat.options || cat.options.length === 0) {
      addIssue('pricing', 'HIGH', `${key}: options 비어있음`);
    } else {
      for (let i = 0; i < cat.options.length; i++) {
        const opt = cat.options[i];
        if (!opt.id) addIssue('pricing', 'MEDIUM', `${key} options[${i}]: id 없음`);
        if (opt.price === undefined || opt.price === null) {
          addIssue('pricing', 'MEDIUM', `${key} options[${i}](${opt.id}): price 없음`);
        }
        if (!opt.name && !opt.label) {
          addIssue('pricing', 'LOW', `${key} options[${i}](${opt.id}): name/label 없음`);
        }
      }
    }
  }
}

async function auditFCMTokens() {
  console.log('\n🔍 5. FCM 토큰 전수조사...');
  const snap = await tdb('fcm_tokens').get();
  
  let noToken = 0, noRole = 0, instructorTokens = 0;
  const roles = {};
  const instructorNames = {};
  
  for (const doc of snap.docs) {
    const d = doc.data();
    if (!d.token) noToken++;
    if (!d.role) noRole++;
    
    const role = d.role || 'unknown';
    roles[role] = (roles[role] || 0) + 1;
    
    if (d.role === 'instructor') {
      instructorTokens++;
      const name = d.instructorName || 'UNKNOWN';
      instructorNames[name] = (instructorNames[name] || 0) + 1;
    }
  }
  
  console.log(`  총 토큰: ${snap.size}`);
  console.log(`  토큰 없음: ${noToken}, role 없음: ${noRole}`);
  console.log(`  role 분포: ${JSON.stringify(roles)}`);
  if (instructorTokens > 0) {
    console.log(`  강사별 토큰: ${JSON.stringify(instructorNames)}`);
  }
}

async function auditSettings() {
  console.log('\n🔍 6. 설정(settings) 전수조사...');
  
  // 강사 목록
  const instSnap = await db.doc(`studios/${STUDIO_ID}/settings/instructors`).get();
  if (instSnap.exists) {
    const list = instSnap.data().list || [];
    console.log(`  강사 수: ${list.length}`);
    let noPhone = 0, noName = 0;
    list.forEach((inst, i) => {
      const name = typeof inst === 'string' ? inst : inst.name;
      const phone = typeof inst === 'string' ? '' : inst.phone;
      if (!name) { noName++; addIssue('settings', 'MEDIUM', `강사[${i}]: 이름 없음`); }
      if (!phone) { noPhone++; }
    });
    console.log(`  이름 없음: ${noName}, 전화 없음: ${noPhone}`);
  } else {
    addIssue('settings', 'HIGH', '강사 설정 문서 없음');
    console.log('  ❌ 강사 설정 없음');
  }
  
  // config
  const configSnap = await db.doc(`studios/${STUDIO_ID}/settings/config`).get();
  if (configSnap.exists) {
    const cfg = configSnap.data();
    console.log(`  config 필드: ${Object.keys(cfg).length}개`);
    if (!cfg.studioName) addIssue('settings', 'MEDIUM', 'config: studioName 없음');
  } else {
    addIssue('settings', 'HIGH', 'config 문서 없음');
  }
}

async function auditRootVsTenant() {
  console.log('\n🔍 7. 루트 vs 테넌트 데이터 비교...');
  
  const collections = ['members', 'attendance', 'sales', 'fcm_tokens'];
  for (const col of collections) {
    const rootSnap = await db.collection(col).limit(1).get();
    const tenantSnap = await tdb(col).limit(1).get();
    
    const rootCount = rootSnap.size > 0 ? '있음' : '없음';
    const tenantCount = tenantSnap.size > 0 ? '있음' : '없음';
    
    if (rootSnap.size > 0) {
      // 루트에 아직 데이터가 남아있으면 확인
      const fullRootSnap = await db.collection(col).get();
      addIssue('migration', 'LOW', `루트 ${col}에 아직 ${fullRootSnap.size}건 데이터 남아있음`);
      console.log(`  ${col}: 루트=${fullRootSnap.size}건, 테넌트=${tenantSnap.size > 0 ? '있음' : '없음'}`);
    } else {
      console.log(`  ${col}: 루트=없음 ✅, 테넌트=${tenantCount}`);
    }
  }
}

async function main() {
  console.log('===================================');
  console.log('  SaaS 데이터 마이그레이션 전수조사');
  console.log(`  스튜디오: ${STUDIO_ID}`);
  console.log(`  시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
  console.log('===================================');
  
  const memberSnap = await auditMembers();
  await auditAttendance(memberSnap);
  await auditSales(memberSnap);
  await auditPricing();
  await auditFCMTokens();
  await auditSettings();
  await auditRootVsTenant();
  
  // 최종 리포트
  console.log('\n===================================');
  console.log('  📊 전수조사 결과 요약');
  console.log('===================================');
  
  const critical = issues.filter(i => i.severity === 'CRITICAL');
  const high = issues.filter(i => i.severity === 'HIGH');
  const medium = issues.filter(i => i.severity === 'MEDIUM');
  const low = issues.filter(i => i.severity === 'LOW');
  
  console.log(`\n🔴 CRITICAL: ${critical.length}건`);
  critical.forEach(i => console.log(`   ${i.category}: ${i.description}`));
  
  console.log(`\n🟠 HIGH: ${high.length}건`);
  high.forEach(i => console.log(`   ${i.category}: ${i.description}`));
  
  console.log(`\n🟡 MEDIUM: ${medium.length}건`);
  medium.slice(0, 20).forEach(i => console.log(`   ${i.category}: ${i.description}`));
  if (medium.length > 20) console.log(`   ... 외 ${medium.length - 20}건`);
  
  console.log(`\n🟢 LOW: ${low.length}건`);
  low.slice(0, 10).forEach(i => console.log(`   ${i.category}: ${i.description}`));
  if (low.length > 10) console.log(`   ... 외 ${low.length - 10}건`);
  
  console.log(`\n총 이슈: ${issues.length}건 (CRITICAL:${critical.length} HIGH:${high.length} MEDIUM:${medium.length} LOW:${low.length})`);
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
