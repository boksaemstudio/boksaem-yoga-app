import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = join(__dirname, 'functions', 'service-account-key.json');
try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) { process.exit(1); }

const db = admin.firestore();
async function checkSales() {
  const snap = await db.collection('sales').where('memberName', '==', '장민정').get();
  snap.docs.forEach(doc => {
    const d = doc.data();
    console.log(`[${doc.id}] 이름: ${d.memberName}, amount: ${d.amount}, startDate: ${d.startDate}, endDate: ${d.endDate}, date: ${d.date}, timestamp: ${d.timestamp}`);
  });
}
checkSales().catch(console.error).finally(() => process.exit(0));
