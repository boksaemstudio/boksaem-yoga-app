
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'functions', 'service-account-key.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixDuplicate() {
  const memberId = 'mvA0leUDiAe47dxLDt59';
  const duplicateLogId = 'XlIyoXVVsPbVq0qBw1Vn'; // 나중 로그 (credits: 6)

  console.log(`Fixing duplicate for member ${memberId}...`);

  const batch = db.batch();

  // 1. Delete duplicate log
  const logRef = db.collection('attendance').doc(duplicateLogId);
  batch.delete(logRef);

  // 2. Restore credit and attendanceCount
  const memberRef = db.collection('members').doc(memberId);
  batch.update(memberRef, {
      credits: admin.firestore.FieldValue.increment(1),
      attendanceCount: admin.firestore.FieldValue.increment(-1)
  });

  await batch.commit();
  console.log('✅ Duplicate log deleted and credit restored.');

  // Verify final state
  const memberSnap = await db.collection('members').doc(memberId).get();
  const data = memberSnap.data();
  console.log(`Final State - Name: ${data.name}, Credits: ${data.credits}, AttendanceCount: ${data.attendanceCount}`);
}

fixDuplicate().catch(console.error);
