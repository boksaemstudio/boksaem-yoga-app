const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function check() {
  const snap = await db.doc('studios/boksaem-yoga/settings/pricing').get();
  if (!snap.exists) { console.log('pricing 문서 없음!'); process.exit(0); }
  const data = snap.data();
  
  // TTC 관련 키 찾기
  for (const [key, val] of Object.entries(data)) {
    if (key === '_meta') continue;
    const lower = key.toLowerCase();
    if (lower.includes('ttc') || (val.label && val.label.toLowerCase().includes('ttc'))) {
      console.log(`\n=== KEY: "${key}" ===`);
      console.log(JSON.stringify(val, null, 2));
    }
  }
  
  // 모든 키와 branches 설정 요약
  console.log('\n=== 전체 키/branches 요약 ===');
  for (const [key, val] of Object.entries(data)) {
    if (key === '_meta') continue;
    console.log(`  ${key}: label="${val.label || 'N/A'}", branches=${JSON.stringify(val.branches || '전체')}`);
  }
  
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
