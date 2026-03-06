// test.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Look for service account key in possible locations
const keyPaths = [
  'c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/serviceAccountKey.json',
  'c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/functions/serviceAccountKey.json'
];

let serviceAccount = null;
for (const p of keyPaths) {
  if (fs.existsSync(p)) {
    serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
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
    
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`[${data.timestamp}] ${data.memberName} - ${data.className} ${data.classTime || 'NO_TIME'}`);
        if(data.memberName === '박소영') {
            console.log(data);
        }
    });

}

run().catch(console.error);
