const admin = require('firebase-admin');
const sa = require('./functions/service-account-key.json');
if (!admin.apps.length) {
  admin.initializeApp({credential: admin.credential.cert(sa)});
}
const db = admin.firestore();

async function check() {
  console.log('Fetching member with phone 010-7759-2620...');
  const membersSnap = await db.collection('studios/boksaem-yoga/members').where('phone', '==', '010-7759-2620').get();
  
  if (membersSnap.empty) {
    console.log('No member found with that phone.');
    return;
  }
  
  for (const doc of membersSnap.docs) {
    const data = doc.data();
    console.log(`\nFound Member: ${data.name} (ID: ${doc.id})`);
    console.log(`Created: ${data.createdAt}, Deleted: ${data.deletedAt ? 'YES' : 'NO'}`);
    
    // Check attendance for this exact ID
    const attSnap = await db.collection('studios/boksaem-yoga/attendance').where('memberId', '==', doc.id).get();
    console.log(`Attendance count for ${doc.id} = ${attSnap.size}`);
    attSnap.docs.forEach(a => {
      console.log(` - ${a.data().date} | ${a.data().className} | ${new Date(a.data().timestamp._seconds * 1000).toLocaleString()}`);
    });
  }

  // Also check if there's any attendance with EXACT NAME "김상아ttc9기"
  console.log(`\n\nFallback: ANY attendance for name "김상아ttc9기" or similar...`);
  const nameSnap = await db.collection('studios/boksaem-yoga/attendance').get();
  // Filter client side
  let foundNames = 0;
  nameSnap.docs.forEach(a => {
      const d = a.data();
      if (d.memberName && d.memberName.includes('김상아')) {
          foundNames++;
          console.log(` - MATCHED NAME: ${d.memberName} | DocID: ${a.id} | MemberID: ${d.memberId} | ${d.date}`);
      }
  });
  console.log(`Total fallbacks matching name = ${foundNames}`);

}

check().then(() => process.exit(0)).catch(console.error);
