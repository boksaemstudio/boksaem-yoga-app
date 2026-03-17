/**
 * 회원권 구분(membershipType) 일괄 수정
 * 
 * 수정 규칙:
 * 1. intensive → advanced (PRICING에 intensive 키 없음, advanced가 심화)
 * 2. 이름에 'ttc' 포함 → ttc
 * 3. 이름에 '키즈초급' 포함 → kids
 * 4. 이름에 '키즈플라잉' 포함 → kids_flying
 * 5. membershipType 빈 값이면서 위에 해당 없으면 → general (기본값)
 */
const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';

// PRICING에 존재하는 유효한 키
const VALID_TYPES = ['general', 'advanced', 'saturday_hatha', 'kids_flying', 'prenatal', 'ttc'];

// 매핑 규칙
const TYPE_MIGRATION = {
  'intensive': 'advanced',  // PRICING에 없는 키 → 가장 가까운 키
};

function inferTypeFromName(name) {
  const lowerName = (name || '').toLowerCase();
  
  if (lowerName.includes('ttc')) return 'ttc';
  if (lowerName.includes('키즈플라잉')) return 'kids_flying';
  if (lowerName.includes('키즈초급') || lowerName.includes('키즈')) return 'kids';
  
  return null;
}

async function fix() {
  const membersRef = db.collection(`studios/${STUDIO_ID}/members`);
  const allMembers = await membersRef.get();
  
  let fixCount = 0;
  let skipCount = 0;
  const fixes = [];
  
  for (const doc of allMembers.docs) {
    const data = doc.data();
    const currentType = data.membershipType || '';
    const name = data.name || '';
    let newType = null;
    let reason = '';
    
    // 1. 이름 기반 추론 (가장 우선)
    const inferredType = inferTypeFromName(name);
    if (inferredType && inferredType !== currentType) {
      newType = inferredType;
      reason = `이름 추론: ${name} → ${inferredType}`;
    }
    
    // 2. intensive → advanced 매핑 (이름 추론이 없는 경우만)
    if (!newType && TYPE_MIGRATION[currentType]) {
      newType = TYPE_MIGRATION[currentType];
      reason = `키 매핑: ${currentType} → ${newType}`;
    }
    
    // 3. 빈 값 → general (이름 추론도 없고 매핑도 없는 경우)
    if (!newType && !currentType) {
      newType = 'general';
      reason = `빈 값 → general (기본)`;
    }
    
    if (newType) {
      fixes.push({ id: doc.id, name, from: currentType || 'EMPTY', to: newType, reason });
    } else {
      skipCount++;
    }
  }
  
  // 변경 내용 미리보기
  console.log(`\n=== 변경 예정: ${fixes.length}건 (유지: ${skipCount}건) ===\n`);
  
  // 타입별 그룹핑
  const groups = {};
  fixes.forEach(f => {
    const key = `${f.from} → ${f.to}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(f.name);
  });
  
  for (const [key, names] of Object.entries(groups)) {
    console.log(`📌 ${key}: ${names.length}명`);
    if (names.length <= 5) {
      names.forEach(n => console.log(`   - ${n}`));
    } else {
      names.slice(0, 3).forEach(n => console.log(`   - ${n}`));
      console.log(`   ... 외 ${names.length - 3}명`);
    }
  }
  
  // DRY RUN 확인
  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    console.log('\n⚠️  DRY RUN 모드 — 실제 수정 없음. --apply로 실행하세요.');
    process.exit(0);
  }
  
  if (!process.argv.includes('--apply')) {
    console.log('\n⚠️  미리보기 모드. 실제 적용하려면 --apply 옵션을 추가하세요.');
    process.exit(0);
  }
  
  // 실제 적용
  console.log('\n🔧 적용 시작...');
  const batchSize = 500;
  let batch = db.batch();
  let batchCount = 0;
  
  for (const fix of fixes) {
    const ref = membersRef.doc(fix.id);
    batch.update(ref, { 
      membershipType: fix.to,
      _membershipTypeFixedAt: new Date().toISOString(),
      _membershipTypePrevious: fix.from
    });
    batchCount++;
    
    if (batchCount >= batchSize) {
      await batch.commit();
      console.log(`  ✅ ${batchCount}건 커밋`);
      batch = db.batch();
      batchCount = 0;
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
    console.log(`  ✅ ${batchCount}건 커밋`);
  }
  
  console.log(`\n✅ 총 ${fixes.length}건 수정 완료!`);
  process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
