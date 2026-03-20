const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(require('../functions/service-account-key.json')) });
}
const db = admin.firestore();

(async () => {
  // 김민지(마포점) 찾기
  const s = await db.collection('studios/boksaem-yoga/members').where('name', '==', '김민지').where('phone', '==', '010-6782-0712').get();
  
  if (s.empty) {
    console.log('김민지(010-6782-0712) 회원을 찾을 수 없습니다.');
    process.exit(1);
  }
  
  for (const d of s.docs) {
    console.log('수정 전:', d.id, 'membershipType:', d.data().membershipType);
    await d.ref.update({ membershipType: 'advanced' });
    console.log('수정 후: membershipType → advanced (심화)');
  }
  
  process.exit(0);
})();
