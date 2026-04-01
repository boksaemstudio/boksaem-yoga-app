const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function checkPricing() {
  // Firestore pricing 데이터 확인
  const pricingRef = db.doc('studios/boksaem-yoga/settings/pricing');
  const pricingSnap = await pricingRef.get();
  
  if (pricingSnap.exists) {
    const data = pricingSnap.data();
    console.log('=== Firestore PRICING Keys ===');
    for (const [key, val] of Object.entries(data)) {
      if (key === '_meta') continue;
      console.log(`  ${key}: label="${val.label || 'N/A'}", options=${(val.options||[]).length}`);
      if (val.options) {
        val.options.forEach((opt, i) => {
          console.log(`    [${i}] id:${opt.id} name:${opt.name} price:${opt.price}`);
        });
      }
    }

    // intensive가 있으면 어떤 label인지
    console.log('\n=== intensive key 상세 ===');
    if (data.intensive) {
      console.log(JSON.stringify(data.intensive, null, 2));
    } else {
      console.log('intensive key 없음!');
      // 키 목록에서 찾기
      const keys = Object.keys(data).filter(k => k !== '_meta');
      console.log('가용 키:', keys);
      
      // 어떤 key가 index 기반으로 intensive를 의미하는지 확인
      keys.forEach((k, i) => {
        console.log(`  [${i}] ${k} → label: ${data[k].label || 'NO_LABEL'}`);
      });
    }
  } else {
    console.log('pricing 문서 없음!');
  }
  
  process.exit(0);
}

checkPricing().catch(e => { console.error(e); process.exit(1); });
