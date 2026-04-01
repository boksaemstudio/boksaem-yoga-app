const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';

async function diagnose() {
  const membersRef = db.collection(`studios/${STUDIO_ID}/members`);
  const allMembers = await membersRef.get();

  // 1. 나혜실 확인
  console.log('\n=== 1. 나혜실 회원 데이터 ===');
  for (const doc of allMembers.docs) {
    const d = doc.data();
    if (d.name && d.name.includes('나혜실')) {
      console.log(`ID: ${doc.id}`);
      console.log(`이름: ${d.name}`);
      console.log(`membershipType: ${d.membershipType}`);
      console.log(`selectedOption: ${d.selectedOption || 'N/A'}`);
      console.log(`planName: ${d.planName || 'N/A'}`);
      console.log(`credits: ${d.credits}`);
      console.log(`dates: ${d.startDate} ~ ${d.endDate}`);
      
      const regs = d.registrations || [];
      if (regs.length > 0) {
        console.log(`registrations (${regs.length}개):`);
        regs.forEach((r, i) => {
          console.log(`  [${i}] type:${r.membershipType} opt:${r.selectedOption || r.planName || '-'} date:${r.regDate || r.startDate || '-'} credits:${r.credits || '-'}`);
        });
      }
    }
  }
  
  // 2. 전체 membershipType 분포
  console.log('\n=== 2. membershipType 분포 ===');
  const counts = {};
  for (const doc of allMembers.docs) {
    const t = doc.data().membershipType || 'MISSING';
    counts[t] = (counts[t] || 0) + 1;
  }
  Object.entries(counts).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}명`));

  // 3. 이름-구분 불일치 의심
  console.log('\n=== 3. 이름-구분 불일치 의심 ===');
  for (const doc of allMembers.docs) {
    const d = doc.data();
    const name = (d.name || '').toLowerCase();
    const type = d.membershipType || '';
    
    if (name.includes('ttc') && type !== 'ttc' && type !== 'TTC')
      console.log(`  ❌ ${d.name} → ${type} (ttc여야함)`);
    if ((name.includes('키즈') || name.includes('kids')) && !type.includes('kids'))
      console.log(`  ❌ ${d.name} → ${type} (kids여야함)`);
  }

  console.log('\n완료');
  process.exit(0);
}

diagnose().catch(e => { console.error(e); process.exit(1); });
