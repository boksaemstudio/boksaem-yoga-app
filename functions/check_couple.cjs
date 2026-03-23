const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.join(__dirname, 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('studios/boksaem-yoga/members').get();
  const targets = [];
  snap.forEach(doc => {
    const d = doc.data();
    if (d.name && (d.name.includes('임승섭') || d.name.includes('주혜령'))) {
      targets.push({ id: doc.id, name: d.name, phone: d.phone, hasFace: !!d.hasFaceDescriptor });
    }
  });

  for (const m of targets) {
    const bio = await db.collection('studios/boksaem-yoga/face_biometrics').doc(m.id).get();
    const bioInfo = bio.exists 
      ? `디스크립터 ${bio.data().faceDescriptors ? bio.data().faceDescriptors.length : (bio.data().descriptor ? 1 : 0)}개`
      : '안면 데이터 없음';
    console.log(`${m.name} | 전화: ${m.phone} | hasFace: ${m.hasFace} | ${bioInfo}`);
  }
  process.exit(0);
})();
