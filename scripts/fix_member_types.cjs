/**
 * 회원 membershipType 일괄 수정 스크립트
 * 
 * 1. 이름에 'ttc' 포함 → membershipType: 'ttc' 
 * 2. membershipType 'kids' → 'kids_flying'
 * 3. pricing branches 한글→영문ID 수정
 */
const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const TENANT = 'studios/boksaem-yoga';
const DRY_RUN = process.argv.includes('--dry-run');

async function fixAll() {
  console.log(`=== 회원 membershipType 일괄 수정 (DRY_RUN: ${DRY_RUN}) ===\n`);

  const membersSnap = await db.collection(`${TENANT}/members`).get();
  const fixes = [];

  membersSnap.docs.forEach(doc => {
    const d = doc.data();
    const name = (d.name || '').toLowerCase();
    const currentType = d.membershipType || 'general';

    // Rule 1: 이름에 'ttc' → ttc
    if (name.includes('ttc') && currentType !== 'ttc') {
      fixes.push({ id: doc.id, name: d.name, from: currentType, to: 'ttc', reason: '이름에 ttc 포함' });
    }
    // Rule 2: 이름에 '키즈' 포함 → kids_flying
    else if ((name.includes('키즈') || name.includes('kids')) && currentType !== 'kids_flying') {
      fixes.push({ id: doc.id, name: d.name, from: currentType, to: 'kids_flying', reason: '이름에 키즈 포함' });
    }
    // Rule 3: kids → kids_flying (유효하지 않은 유형)
    else if (currentType === 'kids') {
      fixes.push({ id: doc.id, name: d.name, from: currentType, to: 'kids_flying', reason: 'kids→kids_flying 유효 유형 수정' });
    }
  });

  console.log(`수정 대상: ${fixes.length}건\n`);
  fixes.forEach(f => {
    console.log(`  [${f.name}] ${f.from} → ${f.to} (${f.reason})`);
  });

  if (!DRY_RUN && fixes.length > 0) {
    console.log(`\n실제 수정 중...`);
    const batchSize = 500;
    for (let i = 0; i < fixes.length; i += batchSize) {
      const batch = db.batch();
      const chunk = fixes.slice(i, i + batchSize);
      chunk.forEach(f => {
        batch.update(db.doc(`${TENANT}/members/${f.id}`), { membershipType: f.to });
      });
      await batch.commit();
      console.log(`  배치 ${Math.floor(i/batchSize) + 1} 완료 (${chunk.length}건)`);
    }
    console.log(`\n✅ ${fixes.length}건 수정 완료!`);
  }

  // Fix 2: pricing branches 수정 (한글→영문ID)
  console.log('\n=== Pricing branches 수정 ===');
  const pricingRef = db.doc(`${TENANT}/settings/pricing`);
  const pricingSnap = await pricingRef.get();
  if (pricingSnap.exists) {
    const data = pricingSnap.data();
    const branchMap = { '광흥창점': 'gwangheungchang', '마포점': 'mapo' };
    let pricingChanged = false;

    for (const [key, val] of Object.entries(data)) {
      if (key === '_meta' || !val.branches) continue;
      const newBranches = val.branches.map(b => branchMap[b] || b);
      const changed = val.branches.some((b, i) => b !== newBranches[i]);
      if (changed) {
        console.log(`  ${key}: [${val.branches}] → [${newBranches}]`);
        data[key].branches = newBranches;
        pricingChanged = true;
      }
    }

    if (pricingChanged && !DRY_RUN) {
      await pricingRef.set(data);
      console.log('✅ Pricing branches 수정 완료!');
    } else if (!pricingChanged) {
      console.log('  이미 정상 (변경 없음)');
    }
  }

  process.exit(0);
}

fixAll().catch(e => { console.error(e); process.exit(1); });
