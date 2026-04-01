const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function makeExpired() {
  const membersRef = db.collection('tenants').doc('tenant-b').collection('members');
  
  // Create Member C (Expired)
  await membersRef.doc('test-edge-member-C').set({
    name: '한은정', // UI에서 이미 만료로 봤던 이름이거나 새로 만듦
    phone: '010-9999-0000',
    membershipType: 'general',
    membershipNumber: 10,
    remainingCredits: 5,
    startDate: new Date('2020-01-01'),
    endDate: '2020-12-31', // 이미 6년 전 만료!
    branchId: 'tenant-b',
    isActive: true, // 활성화 상태라도 날짜가 지나면 만료됨
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log('Expired Member (한은정, 0000) created successfully.');
  process.exit(0);
}

makeExpired().catch(e => { console.error(e); process.exit(1); });
