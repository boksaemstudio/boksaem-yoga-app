const { admin } = require('./helpers/common');
const db = admin.firestore();

async function inspect() {
  const today = '2026-02-15';
  console.log(`=== Inspecting data for ${today} ===`);

  // 1. Check daily_classes for Gwangheungchang
  const dcGhc = await db.collection('daily_classes').doc(`gwangheungchang_${today}`).get();
  if (dcGhc.exists) {
    console.log('Daily Classes (GHC):', JSON.stringify(dcGhc.data().classes, null, 2));
  } else {
    console.log('Daily Classes (GHC) DOES NOT EXIST');
  }

  // 2. Check daily_classes for Mapo
  const dcMapo = await db.collection('daily_classes').doc(`mapo_${today}`).get();
  if (dcMapo.exists) {
    console.log('Daily Classes (Mapo):', JSON.stringify(dcMapo.data().classes, null, 2));
  } else {
    console.log('Daily Classes (Mapo) DOES NOT EXIST');
  }

  // 3. Find members and their logs
  const targetNames = ['박미진', '이수연'];
  for (const name of targetNames) {
    console.log(`\n--- Member: ${name} ---`);
    const mSnap = await db.collection('members').where('name', '==', name).get();
    mSnap.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}, Branch: ${data.branchId}, Phone: ${data.phone}`);
    });

    const lSnap = await db.collection('attendance')
      .where('date', '==', today)
      .where('memberName', '==', name)
      .get();
    
    lSnap.forEach(doc => {
      const data = doc.data();
      console.log(`Log - ID: ${doc.id}, Branch: ${data.branchId}, Class: ${data.className}, Instructor: ${data.instructor}, Timestamp: ${data.timestamp}`);
    });
  }
}

inspect().then(() => {}).catch(e => { console.error(e); });
