/**
 * 회원 membershipType vs 결제금액 불일치 전수 스캔 v2
 * pricing 없이 직접 금액+membershipType으로 스캔
 */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

(async () => {
  const studioId = 'boksaem-yoga';
  
  // 1. 모든 회원 가져오기
  const membersSnap = await db.collection(`studios/${studioId}/members`).get();
  console.log(`총 회원 수: ${membersSnap.size}`);
  
  // 2. 모든 매출 가져오기
  const salesSnap = await db.collection(`studios/${studioId}/sales`).get();
  console.log(`총 매출 건수: ${salesSnap.size}`);
  
  // 매출을 memberId로 그룹핑 (최신 register 건)
  const registerSales = {};
  salesSnap.forEach(doc => {
    const s = doc.data();
    if (s.memberId && s.type === 'register') {
      if (!registerSales[s.memberId]) registerSales[s.memberId] = [];
      registerSales[s.memberId].push({ ...s, id: doc.id });
    }
  });
  
  // 3. membershipType 분포
  const typeDist = {};
  let activeCount = 0;
  
  // 4. 불일치 리스트 (pricing 없이 - 금액 + item 이름으로 판단)
  const issues = [];
  
  membersSnap.forEach(doc => {
    const m = doc.data();
    const memberId = doc.id;
    const type = m.membershipType || 'MISSING';
    typeDist[type] = (typeDist[type] || 0) + 1;
    
    // 활동중인 회원만
    const credits = m.credits || 0;
    if (credits <= 0) return;
    const endDate = m.endDate;
    if (endDate && endDate !== 'TBD') {
      const end = new Date(endDate);
      if (end < new Date()) return;
    }
    activeCount++;
    
    // 매출 기록 확인
    const sales = registerSales[memberId] || [];
    // 최신 매출
    const lastSale = sales.length > 0 
      ? sales.sort((a,b) => {
          const ta = a.timestamp?.toDate?.() || new Date(a.date || 0);
          const tb = b.timestamp?.toDate?.() || new Date(b.date || 0);
          return tb - ta;
        })[0]
      : null;
    
    if (!lastSale) return;
    
    const item = (lastSale.item || '').toLowerCase();
    const amount = lastSale.amount || 0;
    
    // 아이템명에 '심화' 또는 'advanced'가 포함인데 type이 general
    if (type === 'general' && (item.includes('심화') || item.includes('advanced') || item.includes('인텐시브'))) {
      issues.push({
        name: m.name, phone: m.phone, branch: m.homeBranch || 'N/A',
        currentType: type, saleItem: lastSale.item, amount, saleDate: lastSale.date,
        credits, endDate: endDate || 'N/A', reason: '아이템명에 심화/advanced 포함'
      });
    }
    
    // type이 advanced인데 아이템명에 '일반' 또는 'general'
    if (type === 'advanced' && (item.includes('일반') || item.includes('general'))) {
      issues.push({
        name: m.name, phone: m.phone, branch: m.homeBranch || 'N/A',
        currentType: type, saleItem: lastSale.item, amount, saleDate: lastSale.date,
        credits, endDate: endDate || 'N/A', reason: '아이템명에 일반/general 포함'
      });
    }
    
    // membershipType 자체가 없는 회원
    if (!m.membershipType) {
      issues.push({
        name: m.name, phone: m.phone, branch: m.homeBranch || 'N/A',
        currentType: 'MISSING', saleItem: lastSale.item || 'N/A', amount, saleDate: lastSale.date || 'N/A',
        credits, endDate: endDate || 'N/A', reason: 'membershipType 필드 없음'
      });
    }
  });
  
  // 5. 결과 출력
  console.log(`\n=== membershipType 분포 (전체 ${membersSnap.size}명) ===`);
  for (const [type, count] of Object.entries(typeDist).sort((a,b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}명`);
  }
  
  console.log(`\n활동중 회원: ${activeCount}명`);
  console.log(`\n=== 불일치 의심: ${issues.length}건 ===\n`);
  
  if (issues.length === 0) {
    console.log('✅ 불일치 회원 없음 (김민지는 이미 수정 완료)');
  } else {
    for (const i of issues) {
      console.log(`❌ ${i.name} (${i.phone}) [${i.branch}]`);
      console.log(`   현재: ${i.currentType} | 결제: ${i.amount?.toLocaleString()}원 | 항목: ${i.saleItem}`);
      console.log(`   결제일: ${i.saleDate} | 잔여: ${i.credits}회 | 만료: ${i.endDate}`);
      console.log(`   사유: ${i.reason}`);
      console.log('');
    }
  }
  
  process.exit(0);
})();
