const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function createMembers() {
  const membersRef = db.collection('tenants').doc('tenant-b').collection('members');
  
  // Create Member A
  await membersRef.doc('test-edge-member-A').set({
    name: '김민지',
    phone: '010-1111-1234',
    membershipType: 'general',
    membershipNumber: 10,
    remainingCredits: 10,
    startDate: new Date('2025-01-01'),
    endDate: '2026-12-31',
    branchId: 'tenant-b',
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Create Member B
  await membersRef.doc('test-edge-member-B').set({
    name: '김민지',
    phone: '010-2222-1234',
    membershipType: 'intensive',
    membershipNumber: 10,
    remainingCredits: 10,
    startDate: new Date('2025-01-01'),
    endDate: '2026-12-31',
    branchId: 'tenant-b',
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log('Members A and B created successfully in tenant-b.');
  process.exit(0);
}

createMembers().catch(e => { console.error(e); process.exit(1); });
