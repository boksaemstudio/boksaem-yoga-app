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

async function check() {
  const allSnap = await db.collection('members').get();
  const matches = [];
  allSnap.docs.forEach(doc => {
    const d = doc.data();
    if (d.name && d.name.includes('장민정')) {
      matches.push({ id: doc.id, ...d });
    }
  });
  
  if (matches.length === 0) {
    console.log('장민정 회원 없음');
  } else {
    matches.forEach(m => {
      console.log(`[${m.id}] 이름: ${m.name}, phone: ${m.phone}, 시작일: ${m.startDate}, 종료일: ${m.endDate}, 잔여회수: ${m.credits}`);
    });
  }
}

check().catch(console.error).finally(() => process.exit(0));
