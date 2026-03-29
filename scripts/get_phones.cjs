const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const acc = require('../functions/service-account-key.json');

try { initializeApp({ credential: cert(acc) }); } catch (e) {}
const db = getFirestore();

async function run() {
  const tdb = db.collection('studios').doc('boksaem-yoga');
  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  
  // Find messages created around today morning for the bulk batch
  const mSnap = await tdb.collection('messages').where('timestamp', '>=', startOfToday.toISOString()).get();
  const memberIds = new Set();
  
  mSnap.forEach(d => {
      const dt = d.data();
      if (dt.memberId) memberIds.add(dt.memberId);
  });

  if (memberIds.size === 0) {
      console.log("오늘 발송된 메시지 대상자가 없습니다.");
      process.exit(0);
  }

  // Fetch member phone numbers
  const phones = [];
  const memberChunks = [];
  const idsArray = Array.from(memberIds);
  
  for (let i = 0; i < idsArray.length; i += 10) {
      memberChunks.push(idsArray.slice(i, i + 10));
  }

  for (const chunk of memberChunks) {
      const snap = await tdb.collection('members').where(getFirestore().constructor.FieldPath.documentId(), 'in', chunk).get();
      snap.docs.forEach(doc => {
          const data = doc.data();
          if (data.phone) {
              phones.push(`${data.name} : ${data.phone}`);
          }
      });
  }

  console.log("--- 아까 단체 문자를 보내려 하셨던 회원 명단 ---");
  console.log(`총 ${phones.length}명\n`);
  console.log(phones.join("\n"));
  process.exit(0);
}

run().catch(console.error);
