const admin = require('firebase-admin');
const sa = require('./functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({credential: admin.credential.cert(sa)});
const db = admin.firestore();
const S = 'boksaem-yoga';
const B = 'gwangheungchang';

async function run() {
  const today = '2026-04-05';
  
  // 1. 오늘 광흥창 전체 (deleted 포함)
  console.log('=== [1] 오늘 광흥창 전체 출석 (삭제 포함) ===');
  const snap = await db.collection(`studios/${S}/attendance`).where('date','==',today).where('branchId','==',B).get();
  snap.docs.forEach(d => {
    const x = d.data();
    const t = x.timestamp ? new Date(x.timestamp).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul'}) : '?';
    const del = x.deletedAt ? ' [DELETED:'+x.deletedAt+']' : '';
    const deny = x.denialReason ? ' [DENIED:'+x.denialReason+']' : '';
    console.log(`  ${t} | ${x.memberName} | status:${x.status}${deny}${del} | class:${x.className}`);
  });
  console.log(`  총:${snap.size}건 (deleted:${snap.docs.filter(d=>d.data().deletedAt).length})`);

  // 2. pending_attendance
  console.log('\n=== [2] pending_attendance ===');
  const pSnap = await db.collection(`studios/${S}/pending_attendance`).get();
  console.log(`  총:${pSnap.size}건`);
  pSnap.docs.forEach(d => {
    const x = d.data();
    console.log(`  ${x.timestamp} | ${x.memberId} | branch:${x.branchId} | status:${x.status}`);
  });

  // 3. 주의 회원 (황선영ttc7기 - 만료+0회, 박송자 - 만료+0회)
  console.log('\n=== [3] 주의 회원 상세 ===');
  const mSnap = await db.collection(`studios/${S}/members`).where('branchId','==',B).get();
  const watchNames = ['황선영', '황선영ttc7기', '박송자'];
  mSnap.docs.forEach(d => {
    const m = d.data();
    if (watchNames.some(n => m.name && m.name.includes(n))) {
      console.log(`  ${m.name} | id:${d.id} | credits:${m.credits} | endDate:${m.endDate} | type:${m.membershipType} | lastAtt:${m.lastAttendance} | upcoming:${JSON.stringify(m.upcomingMembership||null)}`);
    }
  });

  // 4. 오늘 스케줄
  console.log('\n=== [4] 광흥창 스케줄 ===');
  const schSnap = await db.collection(`studios/${S}/schedules`).where('branchId','==',B).get();
  schSnap.docs.forEach(d => {
    const x = d.data();
    console.log(`  ${x.time} | ${x.title||x.className} | days:${JSON.stringify(x.days)} | inst:${x.instructor}`);
  });

  // 5. 스튜디오 설정
  console.log('\n=== [5] 스튜디오 설정 ===');
  const sDoc = await db.doc(`studios/${S}`).get();
  if (sDoc.exists) {
    const s = sDoc.data();
    console.log('  branches: '+JSON.stringify(s.branches));
  }
}

run().then(()=>process.exit(0)).catch(e=>{console.error('ERR:',e.message);process.exit(1)});
