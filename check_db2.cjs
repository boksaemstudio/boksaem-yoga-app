const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const keyPaths = [
  'c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/serviceAccountKey.json',
  'c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/functions/serviceAccountKey.json'
];

let serviceAccount = null;
for (const p of keyPaths) {
  if (fs.existsSync(p)) {
    serviceAccount = require(p);
    break;
  }
}

if (!serviceAccount) {
    console.log("No service account key found.");
    process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
    console.log("Fetching today's attendance records...");
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const snapshot = await db.collection('attendance').where('date', '==', today).get();
    
    let found = false;
    snapshot.forEach(doc => {
        const data = doc.data();
        if(data.memberName.includes('소영')) {
            console.log(`[${data.timestamp}] ${data.memberName} - ${data.className} ${data.classTime || 'NO_TIME'} (branch: ${data.branchId})`);
            console.log(data);
            found = true;
        }
    });
    if(!found) {
        console.log("No records for 소영 found today. Showing all records for today:");
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`[${data.timestamp}] ${data.memberName} - ${data.className} ${data.classTime || 'NO_TIME'} (branch: ${data.branchId})`);
        });
    }
}
run().catch(console.error);
