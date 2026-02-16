const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function getTimes() {
  const names = ['이청미', '신보영'];
  
  for (const name of names) {
    const memSnap = await db.collection('members').where('name', '==', name).get();
    if (memSnap.empty) continue;
    const memberId = memSnap.docs[0].id;
    
    // Get recent attendance only by memebr ID (no composite index needed)
    const attSnap = await db.collection('attendance')
        .where('memberId', '==', memberId)
        .limit(20) // Just check recent ones
        .get();
        
    console.log(`\nAttendance for ${name}:`);
    if (attSnap.empty) {
        console.log("- No record today");
    } else {
        attSnap.forEach(doc => {
            const data = doc.data();
            const note = data.note || '';
            const ts = new Date(data.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
            console.log(`- ${ts} (Note: ${note})`);
        });
    }
  }
}

getTimes();
