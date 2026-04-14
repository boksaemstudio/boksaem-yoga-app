const admin = require('firebase-admin');

// Ensure app is initialized
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkMember() {
  const name = "조유정";
  const phoneTail = "0703";

  const studios = ['ssangmunyoga', 'boksaem-yoga', 'passflowai', 'yoga']; // Add common ones or just query all

  try {
    let found = false;
    const allStudiosSnap = await db.collection('studios').get();
    
    for (const studioDoc of allStudiosSnap.docs) {
      const studioId = studioDoc.id;
      const membersRef = db.collection('studios').doc(studioId).collection('members');
      
      const snap = await membersRef.where('name', '==', name).get();
      for (const doc of snap.docs) {
        const data = doc.data();
        if (data.phone && data.phone.endsWith(phoneTail)) {
          console.log(`\nFound in studio: ${studioId}`);
          console.log(`Member: ${data.name} (${data.phone})`);
          console.log(`Start Date: ${data.startDate}`);
          console.log(`End Date: ${data.endDate}`);
          console.log(`Duration: ${data.duration}`);
          console.log(`Status: ${data.status}`);
          console.log(`Recent Sales:`);
          
          const salesSnap = await db.collection('studios').doc(studioId).collection('sales')
            .where('memberId', '==', doc.id)
            .orderBy('createdAt', 'desc')
            .limit(3).get();
            
          salesSnap.forEach(sDoc => {
            const s = sDoc.data();
            console.log(`  Sale ID: ${sDoc.id}`);
            console.log(`    Date: ${s.createdAt?.toDate ? s.createdAt.toDate().toLocaleString() : s.createdAt}`);
            console.log(`    Product: ${s.productName}`);
            console.log(`    Months: ${s.months || 'N/A'}, Duration: ${s.duration || 'N/A'}`);
            console.log(`    Amount: ${s.amount}`);
          });
          found = true;
        }
      }
    }
    
    if (!found) {
      console.log("Member not found in any studio.");
    }
  } catch (error) {
    console.error("Error querying member:", error);
  }
}

checkMember();
