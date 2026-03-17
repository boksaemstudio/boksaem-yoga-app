/**
 * 전수조사 결과 심층 검증
 * 
 * 각 이슈가 진짜 문제인지 오탐(false positive)인지 확인
 */
const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';
const tdb = (col) => db.collection(`studios/${STUDIO_ID}/${col}`);

async function verify() {

  // ============================================
  // 1. settings/config 문서 — 진짜 없나?
  // ============================================
  console.log('\n=== 1. settings/config 검증 ===');
  const configSnap = await db.doc(`studios/${STUDIO_ID}/settings/config`).get();
  console.log(`  studios/${STUDIO_ID}/settings/config 존재: ${configSnap.exists}`);
  
  // 혹시 다른 경로에 있나?
  const studioDocSnap = await db.doc(`studios/${STUDIO_ID}`).get();
  if (studioDocSnap.exists) {
    const studioData = studioDocSnap.data();
    console.log(`  studios/${STUDIO_ID} 문서 존재: true`);
    console.log(`  studios/${STUDIO_ID} 필드: ${Object.keys(studioData).join(', ')}`);
    if (studioData.studioName) console.log(`  → studioName: ${studioData.studioName}`);
  }
  
  // settings 하위 문서 전체 확인
  const settingsSnap = await db.collection(`studios/${STUDIO_ID}/settings`).get();
  console.log(`  settings 하위 문서 목록: ${settingsSnap.docs.map(d => d.id).join(', ')}`);

  // ============================================
  // 2. pricing 옵션 price 필드 — 다른 필드명 사용?
  // ============================================
  console.log('\n=== 2. pricing 옵션 필드 구조 검증 ===');
  const pricingSnap = await db.doc(`studios/${STUDIO_ID}/settings/pricing`).get();
  if (pricingSnap.exists) {
    const data = pricingSnap.data();
    // general의 첫 번째 옵션의 전체 필드를 보자
    const generalOpts = data.general?.options || [];
    if (generalOpts.length > 0) {
      console.log('  general options[0] 전체 필드:');
      console.log('  ', JSON.stringify(generalOpts[0], null, 2));
      console.log('  general options[1] 전체 필드:');
      console.log('  ', JSON.stringify(generalOpts[1], null, 2));
    }
    
    const advOpts = data.advanced?.options || [];
    if (advOpts.length > 0) {
      console.log('  advanced options[0] 전체 필드:');
      console.log('  ', JSON.stringify(advOpts[0], null, 2));
    }
  }

  // ============================================
  // 3. 매출 741건 날짜/타입 없음 — 실제 필드 구조 확인
  // ============================================
  console.log('\n=== 3. 매출(sales) 필드 구조 검증 ===');
  const salesSnap = await tdb('sales').limit(5).get();
  salesSnap.docs.forEach((doc, i) => {
    const d = doc.data();
    console.log(`  sales[${i}] 전체 필드:`);
    const keys = Object.keys(d);
    console.log(`    키: ${keys.join(', ')}`);
    console.log(`    date: ${d.date || 'N/A'}, regDate: ${d.regDate || 'N/A'}, createdAt: ${d.createdAt || 'N/A'}`);
    console.log(`    type: ${d.type || 'N/A'}, saleType: ${d.saleType || 'N/A'}, membershipType: ${d.membershipType || 'N/A'}`);
    console.log(`    amount: ${d.amount}, price: ${d.price}, memberName: ${d.memberName || d.name || 'N/A'}`);
  });
  
  // 날짜가 있는 매출 vs 없는 매출 비교
  const allSalesSnap = await tdb('sales').get();
  let hasDate = 0, noDate = 0;
  let sampleNoDate = null;
  for (const doc of allSalesSnap.docs) {
    const d = doc.data();
    if (d.date || d.regDate || d.createdAt) hasDate++;
    else {
      noDate++;
      if (!sampleNoDate) sampleNoDate = { id: doc.id, ...d };
    }
  }
  console.log(`  날짜 있음: ${hasDate}, 날짜 없음: ${noDate}`);
  if (sampleNoDate) {
    console.log(`  날짜 없는 매출 샘플 전체:`);
    console.log(`    ${JSON.stringify(sampleNoDate, null, 2).substring(0, 500)}`);
  }

  // ============================================
  // 4. FCM 토큰 36건 빈 token — doc ID가 token인가?
  // ============================================
  console.log('\n=== 4. FCM 토큰 필드 구조 검증 ===');
  const fcmSnap = await tdb('fcm_tokens').limit(5).get();
  fcmSnap.docs.forEach((doc, i) => {
    const d = doc.data();
    console.log(`  fcm[${i}] docId길이: ${doc.id.length}, token필드있음: ${!!d.token}, role: ${d.role}`);
    // doc ID와 token 필드가 같은지
    if (d.token) {
      console.log(`    docId === token: ${doc.id === d.token}`);
    } else {
      console.log(`    docId: ${doc.id.substring(0, 30)}...`);
      console.log(`    전체 필드: ${Object.keys(d).join(', ')}`);
    }
  });
  
  // token 필드가 없는 것들의 패턴
  let noTokenField = 0, hasTokenField = 0;
  let noTokenSample = null;
  for (const doc of (await tdb('fcm_tokens').get()).docs) {
    const d = doc.data();
    if (d.token) hasTokenField++;
    else {
      noTokenField++;
      if (!noTokenSample) noTokenSample = { docId: doc.id, fields: Object.keys(d), data: d };
    }
  }
  console.log(`  token 필드 있음: ${hasTokenField}, 없음: ${noTokenField}`);
  if (noTokenSample) {
    console.log(`  token 없는 샘플: docId길이=${noTokenSample.docId.length}`);
    console.log(`    필드: ${noTokenSample.fields.join(', ')}`);
    // doc ID 자체가 토큰일 수 있음 (FCM 토큰은 보통 길이 100+)
    console.log(`    → doc ID가 토큰인가? (길이 > 100): ${noTokenSample.docId.length > 100}`);
  }

  console.log('\n=== 검증 완료 ===');
  process.exit(0);
}

verify().catch(e => { console.error(e); process.exit(1); });
