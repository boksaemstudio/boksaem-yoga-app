const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const acc = require('../functions/service-account-key.json');

try { initializeApp({ credential: cert(acc) }); } catch (e) {}
const db = getFirestore();

async function run() {
  const tdb = db.collection('studios').doc('boksaem-yoga');
  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  
  const mSnap = await tdb.collection('messages').where('timestamp', '>=', startOfToday.toISOString()).limit(1).get();
  
  if (!mSnap.empty) {
      console.log("--- 전송 실패된 문자 내용 ---");
      console.log(mSnap.docs[0].data().content);
  } else {
      console.log("오늘 보낸 메시지 내용을 찾을 수 없습니다.");
  }
  process.exit(0);
}

run().catch(console.error);
