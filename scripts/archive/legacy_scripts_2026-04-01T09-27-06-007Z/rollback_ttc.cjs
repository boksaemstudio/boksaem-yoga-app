/**
 * TTC 일괄 변경 롤백
 * 이름에 ttc가 포함된다고 현재 TTC 회원이 아님 (과거 TTC였던 회원)
 * → 원래 membershipType으로 복원
 * 
 * 원래 값 목록 (fix_member_types.cjs 실행 로그에서 추출):
 * advanced → ttc 였던 회원: 노효원, 나혜실, 박주희, 박수미, 문정훈
 * 나머지: general → ttc
 */
const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const TENANT = 'studios/boksaem-yoga';
const DRY_RUN = process.argv.includes('--dry-run');

// advanced였다가 ttc로 잘못 바뀐 회원 (5명)
const WAS_ADVANCED = ['노효원ttc2기', '나혜실ttc6기', '박주희ttc7기', '박수미ttc8기', '문정훈ttc6기'];

async function rollback() {
  console.log(`=== TTC 롤백 (DRY_RUN: ${DRY_RUN}) ===\n`);
  
  const membersSnap = await db.collection(`${TENANT}/members`).get();
  const rollbacks = [];

  membersSnap.docs.forEach(doc => {
    const d = doc.data();
    const name = (d.name || '');
    const nameLower = name.toLowerCase();

    // ttc 이름이면서 현재 ttc로 설정된 회원 → 원래 값으로 복원
    if (nameLower.includes('ttc') && d.membershipType === 'ttc') {
      const originalType = WAS_ADVANCED.includes(name) ? 'advanced' : 'general';
      rollbacks.push({ id: doc.id, name, to: originalType });
    }
  });

  console.log(`롤백 대상: ${rollbacks.length}건\n`);
  rollbacks.forEach(r => {
    console.log(`  [${r.name}] ttc → ${r.to}`);
  });

  if (!DRY_RUN && rollbacks.length > 0) {
    const batch = db.batch();
    rollbacks.forEach(r => {
      batch.update(db.doc(`${TENANT}/members/${r.id}`), { membershipType: r.to });
    });
    await batch.commit();
    console.log(`\n✅ ${rollbacks.length}건 롤백 완료!`);
  }

  // 개별 수정: 이제인ttc9기 → ttc (사용자 확인)
  console.log('\n=== 개별 수정 ===');
  const jejeinSnap = await db.collection(`${TENANT}/members`).where('name', '==', '이제인ttc9기').get();
  if (!jejeinSnap.empty) {
    const doc = jejeinSnap.docs[0];
    console.log(`  이제인ttc9기 (${doc.id}): ${doc.data().membershipType} → ttc`);
    if (!DRY_RUN) {
      await db.doc(`${TENANT}/members/${doc.id}`).update({ membershipType: 'ttc' });
      console.log('  ✅ 수정 완료');
    }
  } else {
    console.log('  이제인ttc9기: 검색 안 됨');
  }

  // 김민지 (마포, credits:979) → advanced (사용자: 심화인데 일반으로 되어있음)
  const kimSnap = await db.collection(`${TENANT}/members`).where('name', '==', '김민지').get();
  kimSnap.docs.forEach(doc => {
    const d = doc.data();
    if (d.branchId === 'mapo' && d.credits >= 900) {
      console.log(`  김민지 마포 (${doc.id}): ${d.membershipType} → advanced`);
      if (!DRY_RUN) {
        db.doc(`${TENANT}/members/${doc.id}`).update({ membershipType: 'advanced' });
        console.log('  ✅ 수정 완료');
      }
    }
  });

  process.exit(0);
}

rollback().catch(e => { console.error(e); process.exit(1); });
