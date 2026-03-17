/**
 * 이름 기반 추론으로 잘못 변경한 membershipType 복구
 * 
 * 복구 대상: _membershipTypePrevious 필드가 있고, 이름 추론으로 변경된 건
 * - ttc 이름 추론 (41+2+1건)
 * - kids/kids_flying 이름 추론 (8건)
 * 
 * 복구 규칙:
 * - _membershipTypePrevious가 있는 경우:
 *   - 'intensive' → 'advanced'로 복구 (PRICING에 intensive 없으므로)
 *   - 'general' → 'general'로 복구
 *   - 'EMPTY' → membershipType을 빈 문자열로 되돌리지 않고 'general'로 유지
 *   - 'kids' → 확인 필요
 */
const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';
const tdb = (col) => db.collection(`studios/${STUDIO_ID}/${col}`);

async function revert() {
  const membersRef = tdb('members');
  const snap = await membersRef.where('_membershipTypeFixedAt', '!=', '').get();
  
  console.log(`\n=== _membershipTypeFixedAt 필드가 있는 회원: ${snap.size}명 ===\n`);
  
  const reverts = [];
  const keeps = [];
  
  for (const doc of snap.docs) {
    const d = doc.data();
    const name = d.name || '';
    const currentType = d.membershipType;
    const prevType = d._membershipTypePrevious;
    const lowerName = name.toLowerCase();
    
    // 이름 추론으로 변경된 것만 복구 대상
    const wasNameInferred = (
      (lowerName.includes('ttc') && currentType === 'ttc') ||
      (lowerName.includes('키즈초급') && currentType === 'kids') ||
      (lowerName.includes('키즈플라잉') && currentType === 'kids_flying') ||
      (lowerName.includes('키즈') && currentType === 'kids')
    );
    
    if (wasNameInferred) {
      // 복구할 값 결정
      let revertTo;
      if (prevType === 'EMPTY' || !prevType) {
        revertTo = 'general';  // 빈 값이었으면 general로
      } else if (prevType === 'intensive') {
        revertTo = 'advanced';  // PRICING에 없는 키는 매핑
      } else {
        revertTo = prevType;  // 원래 값으로
      }
      
      reverts.push({ id: doc.id, name, from: currentType, to: revertTo, prevType });
    } else {
      keeps.push({ name, type: currentType, prevType });
    }
  }
  
  console.log(`복구 대상: ${reverts.length}건`);
  console.log(`유지 (올바른 수정): ${keeps.length}건\n`);
  
  // 복구 대상 상세
  console.log('=== 복구 대상 ===');
  reverts.forEach(r => {
    console.log(`  ${r.name}: ${r.from} → ${r.to} (원래: ${r.prevType})`);
  });
  
  if (!process.argv.includes('--apply')) {
    console.log('\n⚠️  미리보기 모드. 실제 적용하려면 --apply 추가.');
    process.exit(0);
  }
  
  // 적용
  console.log('\n🔧 복구 적용 중...');
  const batch = db.batch();
  for (const r of reverts) {
    const ref = membersRef.doc(r.id);
    batch.update(ref, { 
      membershipType: r.to,
      _membershipTypeRevertedAt: new Date().toISOString(),
      _membershipTypeRevertReason: '이름 추론 오류 복구'
    });
  }
  await batch.commit();
  console.log(`✅ ${reverts.length}건 복구 완료!`);
  
  process.exit(0);
}

revert().catch(e => { console.error(e); process.exit(1); });
