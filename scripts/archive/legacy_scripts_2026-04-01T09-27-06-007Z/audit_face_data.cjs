const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function audit() {
  console.log('=== 1. 최근 출석 기록 (오늘 - 인덱스 없이) ===');
  const attSnap = await db.collection('studios/boksaem-yoga/attendance')
    .orderBy('timestamp', 'desc')
    .limit(30)
    .get();
  
  for (const doc of attSnap.docs) {
    const d = doc.data();
    console.log(`  ${d.timestamp || d.date} | ${d.memberName || '??'} (${d.memberId}) | method: ${d.method || d.checkInMethod || '??'} | photo: ${d.photoUrl ? 'YES' : 'NO'}`);
  }
  
  console.log('\n=== 2. 얼굴 생체 데이터 전수 조사 ===');
  const bioSnap = await db.collection('studios/boksaem-yoga/face_biometrics').get();
  console.log(`  총 ${bioSnap.size}개 얼굴 등록됨`);
  
  const allDescriptors = [];
  
  for (const doc of bioSnap.docs) {
    const data = doc.data();
    const memberId = doc.id;
    
    let memberName = '??';
    try {
      const memberDoc = await db.doc(`studios/boksaem-yoga/members/${memberId}`).get();
      if (memberDoc.exists) memberName = memberDoc.data().name;
    } catch {}
    
    const descriptor = data.descriptor;
    
    let descValid = false;
    let descLength = 0;
    if (Array.isArray(descriptor)) {
      descLength = descriptor.length;
      descValid = descriptor.length === 128 && typeof descriptor[0] === 'number';
      if (descValid) {
        allDescriptors.push({ id: memberId, name: memberName, desc: descriptor });
      }
    }
    
    // descriptors 필드 검사
    const descriptors = data.descriptors;
    let descInfo = 'N/A';
    if (Array.isArray(descriptors)) {
      const types = descriptors.map(d => {
        if (Array.isArray(d)) return `array[${d.length}]`;
        if (d && typeof d === 'object' && d.vector) return `obj{vector:${d.vector.length}}`;
        return typeof d;
      });
      descInfo = `${descriptors.length}개 [${types.slice(0,3).join(', ')}${types.length > 3 ? '...' : ''}]`;
    }
    
    console.log(`  ${descValid ? '✅' : '❌'} ${memberName} (${memberId}) | descriptor: ${descLength}d | descriptors: ${descInfo}`);
  }
  
  console.log('\n=== 3. 얼굴 유사도 행렬 (오인식 가능성) ===');
  const dangerPairs = [];
  for (let i = 0; i < allDescriptors.length; i++) {
    for (let j = i + 1; j < allDescriptors.length; j++) {
      const a = allDescriptors[i];
      const b = allDescriptors[j];
      let sum = 0;
      for (let k = 0; k < 128; k++) {
        const diff = a.desc[k] - b.desc[k];
        sum += diff * diff;
      }
      const dist = Math.sqrt(sum);
      if (dist < 0.6) {
        dangerPairs.push({ a: `${a.name}(${a.id.slice(0,6)})`, b: `${b.name}(${b.id.slice(0,6)})`, dist: dist.toFixed(4) });
      }
    }
  }
  
  if (dangerPairs.length > 0) {
    console.log('  ⚠️ 위험한 유사도 쌍 (거리 < 0.6 → 오인식 위험):');
    dangerPairs.forEach(p => console.log(`    ${p.a} ↔ ${p.b} = ${p.dist}`));
  } else {
    console.log('  ✅ 등록된 얼굴들 간 교차 오인식 위험 없음');
  }
  
  console.log('\n=== 4. 현재 코드 임계값 ===');
  console.log('  minDistance 초기값: 0.5 (이 값 이하면 같은 사람으로 판단)');
  console.log('  0.5는 너무 관대 → 0.42 이하로 낮춰야 안전');
  
  process.exit(0);
}

audit().catch(e => { console.error(e); process.exit(1); });
