
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'functions', 'service-account-key.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function revertFix() {
  const memberId = 'mvA0leUDiAe47dxLDt59';
  const logId = 'XlIyoXVVsPbVq0qBw1Vn';
  const attendanceData = {
    memberId: "mvA0leUDiAe47dxLDt59",
    memberName: "이청미",
    branchId: "gwangheungchang",
    date: "2026-02-18",
    className: "하타",
    instructor: "정연",
    timestamp: "2026-02-18T00:42:34.427Z",
    status: "valid",
    syncMode: "offline-restored",
    credits: 6,
    cumulativeCount: 4
  };

  console.log(`Reverting fix: Restoring attendance for ${memberId}...`);

  const batch = db.batch();

  // 1. Restore the log
  const logRef = db.collection('attendance').doc(logId);
  batch.set(logRef, attendanceData);

  // 2. Re-deduct credit and re-increment attendanceCount
  const memberRef = db.collection('members').doc(memberId);
  batch.update(memberRef, {
      credits: admin.firestore.FieldValue.increment(-1),
      attendanceCount: admin.firestore.FieldValue.increment(1)
  });

  await batch.commit();
  console.log('✅ Attendance log restored and member stats updated back.');

  // Verify final state
  const memberSnap = await db.collection('members').doc(memberId).get();
  const data = memberSnap.data();
  console.log(`Final State - Name: ${data.name}, Credits: ${data.credits}, AttendanceCount: ${data.attendanceCount}`);
}

revertFix().catch(console.error);
