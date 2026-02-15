const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'boksaem-yoga'
    });
}

const db = admin.firestore();

async function fixAndInspect() {
  const today = '2026-02-15';
  console.log(`=== Inspecting and Fixing data for ${today} ===`);

  // 1. Check daily_classes for Gwangheungchang
  const dcGhc = await db.collection('daily_classes').doc(`gwangheungchang_${today}`).get();
  if (dcGhc.exists) {
    console.log('Daily Classes (GHC):', JSON.stringify(dcGhc.data().classes, null, 2));
  } else {
    console.log('Daily Classes (GHC) DOES NOT EXIST');
    
    // Attempt to see if ANY daily_classes exist for today
    const allDc = await db.collection('daily_classes').where('__name__', '>=', `gwangheungchang_2026`).get();
    console.log(`Found ${allDc.size} documents matching gwangheungchang_2026*`);
    allDc.forEach(doc => console.log(` - ${doc.id}`));
  }

  // 2. Fix members and their logs
  const targetNames = ['박미진', '이수연'];
  for (const name of targetNames) {
    console.log(`\n--- Processing Member: ${name} ---`);
    
    // Check member profile
    const mSnap = await db.collection('members').where('name', '==', name).get();
    if (mSnap.empty) {
        console.log(`[WARN] Member ${name} not found!`);
        continue;
    }

    const memberDoc = mSnap.docs[0];
    const memberData = memberDoc.data();
    console.log(`ID: ${memberDoc.id}, Profile Branch: ${memberData.branchId}, Phone: ${memberData.phone}`);

    // If branch is Mapo but user says they are at GHC Mysore, we might need to update prefix if it was a mistake
    // But better to just fix the attendance record first.

    // Find today's logs
    const lSnap = await db.collection('attendance')
      .where('date', '==', today)
      .where('memberName', '==', name)
      .get();
    
    if (lSnap.empty) {
        console.log(`[WARN] No attendance log found for ${name} today.`);
    }

    for (const doc of lSnap.docs) {
      const logData = doc.data();
      console.log(`Existing Log: ID=${doc.id}, Branch=${logData.branchId}, Class=${logData.className}, Instructor=${logData.instructor}`);
      
      if (logData.className === '자율수련') {
          console.log(`[FIX] Updating log ${doc.id} to Mysore (Wonjang) at Gwangheungchang`);
          await doc.ref.update({
              className: '마이솔',
              instructor: '원장',
              branchId: 'gwangheungchang' // Force GHC branch for this record
          });
          console.log(`[FIX] Successfully updated log ${doc.id}`);
      }
    }
    
    // Ensure member branch is set to Gwangheungchang if it was Mapo (optional, but requested by user's context)
    if (memberData.branchId !== 'gwangheungchang') {
        console.log(`[FIX] Updating member ${name} profile branch from ${memberData.branchId} to gwangheungchang`);
        await memberDoc.ref.update({ branchId: 'gwangheungchang' });
    }
  }
}

fixAndInspect().then(() => console.log('\n=== DONE ===')).catch(e => { console.error(e); });
