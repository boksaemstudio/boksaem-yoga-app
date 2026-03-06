import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = join(__dirname, 'functions', 'service-account-key.json');

try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (e) {
  console.error('Service account key not found');
  process.exit(1);
}

const db = admin.firestore();

async function checkSales() {
  const allSnap = await db.collection('sales').get();
  const matches = [];
  allSnap.docs.forEach(doc => {
    const d = doc.data();
    if (d.memberName && d.memberName.includes('김혜진')) {
      matches.push({ id: doc.id, ...d });
    }
  });
  
  if (matches.length === 0) {
    console.log('김혜진 매출 없음');
  } else {
    matches.sort((a,b) => (b.timestamp||b.date) > (a.timestamp||a.date) ? 1 : -1);
    matches.forEach(m => {
      console.log(`[${m.id}] 이름: ${m.memberName}, amount: ${m.amount}, startDate: ${m.startDate}, endDate: ${m.endDate}, date: ${m.date}, timestamp: ${m.timestamp}`);
    });
  }
}

checkSales().catch(console.error).finally(() => process.exit(0));
