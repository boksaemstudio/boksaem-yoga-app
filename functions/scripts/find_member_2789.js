const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findMember() {
    const branchId = 'mapo';
    const last4 = '2789';

    console.log(`Searching for member with last4 ${last4} in ${branchId}...`);

    // Search by phoneLast4
    let snapshot = await db.collection('members')
        .where('phoneLast4', '==', last4)
        .get();

    if (snapshot.empty) {
        // Try filtering all members (slow but sure)
        console.log("No match by index, scanning all...");
        snapshot = await db.collection('members').get();
        const matches = snapshot.docs.filter(d => {
            const data = d.data();
            return data.phone && data.phone.endsWith(last4);
        });
        
        matches.forEach(d => printMember(d));
    } else {
        snapshot.forEach(d => printMember(d));
    }
}

async function printMember(doc) {
    const data = doc.data();
    console.log(`Found Member: ${data.name} (${doc.id})`);
    console.log(`- Branch: ${data.branchId}`); // Might be array or string
    console.log(`- Credits: ${data.credits}`);
    
    // Check attendance for today
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    console.log(`Checking attendance for today (${today})...`);
    
    const attSnap = await db.collection('attendance')
        .where('memberId', '==', doc.id)
        .where('date', '==', today)
        .get();
    
    attSnap.forEach(a => {
        const att = a.data();
        console.log(`- Attendance: ${att.timestamp} | Status: ${att.status} | Sess: ${att.sessionNumber}`);
    });
}

findMember().catch(console.error);
