const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function addTTC() {
  const pricingRef = db.doc('studios/boksaem-yoga/settings/pricing');
  
  // TTC 회원권 추가: 가격 0, 무제한(9999), 기간은 관리자 입력
  await pricingRef.update({
    'ttc': {
      label: 'TTC (지도자과정)',
      branches: ['광흥창점', '마포점'],
      options: [
        {
          id: 'ttc_unlimited',
          label: 'TTC',
          basePrice: 0,
          credits: 9999,
          type: 'subscription'
        }
      ]
    }
  });

  console.log('✅ TTC 회원권 추가 완료 (광흥창점 + 마포점, 가격 0, 무제한)');
  
  // 검증
  const snap = await pricingRef.get();
  const data = snap.data();
  if (data.ttc) {
    console.log('\n=== TTC 확인 ===');
    console.log(JSON.stringify(data.ttc, null, 2));
  }
  
  process.exit(0);
}

addTTC().catch(e => { console.error(e); process.exit(1); });
