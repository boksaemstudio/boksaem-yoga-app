const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const keyPath = path.join(__dirname, 'service-account-key.json');
if (!fs.existsSync(keyPath)) {
  console.error('서비스 키 파일 없음:', keyPath);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
const db = admin.firestore();

async function diagnose() {
  console.log('=== 매출 & 회원 진단 ===\n');

  // 1. 루트 sales
  const rootSales = await db.collection('sales').get();
  let rootMarch = 0;
  rootSales.forEach(d => {
    const data = d.data();
    const amt = Number(data.amount) || 0;
    const dateStr = data.date || data.timestamp || '';
    if (typeof dateStr === 'string' && dateStr.startsWith('2026-03')) rootMarch += amt;
  });
  console.log(`[루트] /sales: ${rootSales.size}건, 3월: ${rootMarch.toLocaleString()}원`);

  // 2. 테넌트 sales
  const tenantSales = await db.collection('studios/boksaem-yoga/sales').get();
  let tenantMarch = 0;
  tenantSales.forEach(d => {
    const data = d.data();
    const amt = Number(data.amount) || 0;
    const dateStr = data.date || data.timestamp || '';
    if (typeof dateStr === 'string' && dateStr.startsWith('2026-03')) tenantMarch += amt;
  });
  console.log(`[테넌트] /studios/boksaem-yoga/sales: ${tenantSales.size}건, 3월: ${tenantMarch.toLocaleString()}원`);

  // 3. stats 확인
  const rootStats = await db.doc('stats/revenue_summary').get();
  console.log(`\n[루트] /stats/revenue_summary: ${rootStats.exists ? '존재' : '없음'}`);
  if (rootStats.exists) {
    const d = rootStats.data();
    if (d.monthly) console.log('  monthly:', JSON.stringify(d.monthly));
  }

  // 4. 회원 중복
  console.log('\n=== 회원 중복 ===');
  const tenantMembers = await db.collection('studios/boksaem-yoga/members').get();
  console.log(`[테넌트] members: ${tenantMembers.size}명`);

  const nameCount = {};
  tenantMembers.forEach(doc => {
    const name = doc.data().name;
    if (name) nameCount[name] = (nameCount[name] || 0) + 1;
  });
  const dupes = Object.entries(nameCount).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
  if (dupes.length > 0) {
    console.log(`중복 이름 (2명+):`);
    dupes.forEach(([name, count]) => console.log(`  ${name}: ${count}명`));
  }

  // 다나 상세
  const danaList = [];
  tenantMembers.forEach(doc => {
    const d = doc.data();
    if (d.name && d.name.includes('다나')) {
      danaList.push({ id: doc.id, name: d.name, phone: d.phone, regDate: d.regDate, endDate: d.endDate, credits: d.credits });
    }
  });
  console.log(`\n'다나' 상세 (${danaList.length}명):`);
  danaList.forEach((m, i) => {
    console.log(`  ${i+1}. [${m.id}] ${m.name} | ${m.phone||'-'} | 등록:${m.regDate||'-'} | 종료:${m.endDate||'-'} | 잔여:${m.credits}`);
  });

  process.exit(0);
}
diagnose().catch(e => { console.error(e.message); process.exit(1); });
