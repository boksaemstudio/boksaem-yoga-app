const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const acc = require('../functions/service-account-key.json');

try { initializeApp({ credential: cert(acc) }); } catch (e) {}
const db = getFirestore();

async function run() {
  const tdb = db.collection('studios').doc('boksaem-yoga');
  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  
  // Find messages created around today morning for the bulk batch
  const mSnap = await tdb.collection('messages').where('timestamp', '>=', startOfToday.toISOString()).get();
  const membersData = [];
  let content = '복샘요가입니다 금일 2시 하타심화 5주차 휴강입니다 이용에 착오 없으시길 바랍니다 -나마스데-';

  mSnap.forEach(d => {
      const dt = d.data();
      if (dt.memberId && dt.content) {
          membersData.push({ id: dt.memberId, content: dt.content, timestamp: dt.timestamp });
          content = dt.content;
      }
  });

  if (membersData.length === 0) {
      console.log("오늘 발송된 메시지 대상자가 없습니다.");
      process.exit(0);
  }

  // Fetch member phone numbers and names
  const memberObj = {};
  const memberChunks = [];
  const idsArray = membersData.map(m => m.id);
  
  for (let i = 0; i < idsArray.length; i += 10) {
      memberChunks.push(idsArray.slice(i, i + 10));
  }

  for (const chunk of memberChunks) {
      const snap = await tdb.collection('members').where(getFirestore().constructor.FieldPath.documentId(), 'in', chunk).get();
      snap.docs.forEach(doc => {
          memberObj[doc.id] = doc.data().name || '알 수 없음';
      });
  }

  console.log(`복원 대상: ${membersData.length}명`);

  // Insert to push_history for missed ones (Exclude Ha Jeong Eun whose push succeeded)
  let count = 0;
  for (const data of membersData) {
      const name = memberObj[data.id] || '알 수 없음';
      if (name === '하정은') continue; // Already exists

      await tdb.collection('push_history').add({
            type: 'individual',
            title: `복샘요가 메시지`,
            body: data.content,
            status: 'failed',
            error: "알리고 서버 IP 미등록 차단 오류 (소급 적용)",
            sendMode: 'push_first',
            successCount: 0,
            failureCount: 1,
            smsResult: false,
            createdAt: FieldValue.serverTimestamp(),
            targetMemberId: data.id,
            memberName: name,
            displayDate: data.timestamp // fake display date to match when it was actually sent
      });
      count++;
  }

  console.log(`성공적으로 ${count}개의 누락된 실패 기록을 복구했습니다.`);
  process.exit(0);
}

run().catch(console.error);
