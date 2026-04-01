const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function purge() {
  const bioSnap = await db.collection('studios/boksaem-yoga/face_biometrics').get();
  console.log(`총 ${bioSnap.size}개 얼굴 데이터 발견`);
  
  // 모든 디스크립터 수집
  const allEntries = [];
  for (const doc of bioSnap.docs) {
    const data = doc.data();
    let memberName = doc.id;
    try {
      const memberDoc = await db.doc(`studios/boksaem-yoga/members/${doc.id}`).get();
      if (memberDoc.exists) memberName = memberDoc.data().name;
    } catch {}
    
    if (Array.isArray(data.descriptor) && data.descriptor.length === 128 && typeof data.descriptor[0] === 'number') {
      allEntries.push({ id: doc.id, name: memberName, desc: data.descriptor });
    }
  }
  
  // 오염된 쌍 찾기 (거리 < 0.35 → 확실히 같은 사람 데이터가 중복 저장됨)
  const toDelete = new Set();
  for (let i = 0; i < allEntries.length; i++) {
    for (let j = i + 1; j < allEntries.length; j++) {
      const a = allEntries[i];
      const b = allEntries[j];
      let sum = 0;
      for (let k = 0; k < 128; k++) {
        const diff = a.desc[k] - b.desc[k];
        sum += diff * diff;
      }
      const dist = Math.sqrt(sum);
      if (dist < 0.35) {
        console.log(`  ❌ 오염 쌍: ${a.name}(${a.id.slice(0,8)}) ↔ ${b.name}(${b.id.slice(0,8)}) = ${dist.toFixed(4)}`);
        // 두 명 다 삭제 (재등록 필요)
        toDelete.add(a.id);
        toDelete.add(b.id);
      }
    }
  }
  
  console.log(`\n오염된 얼굴 데이터: ${toDelete.size}개 → 삭제 진행`);
  
  for (const id of toDelete) {
    const entry = allEntries.find(e => e.id === id);
    console.log(`  🗑️ 삭제: ${entry?.name || id}`);
    await db.doc(`studios/boksaem-yoga/face_biometrics/${id}`).delete();
    try {
      await db.doc(`studios/boksaem-yoga/members/${id}`).update({
        hasFaceDescriptor: false,
        faceUpdatedAt: admin.firestore.FieldValue.delete()
      });
    } catch {}
  }
  
  console.log('\n✅ 오염된 얼굴 데이터 정리 완료');
  console.log('정리된 회원은 출석부에서 얼굴을 다시 등록해야 합니다.');
  process.exit(0);
}

purge().catch(e => { console.error(e); process.exit(1); });
