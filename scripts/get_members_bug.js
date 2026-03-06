import { db } from '../src/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function run() {
  try {
    const snap = await getDocs(collection(db, 'members'));
    snap.forEach(doc => {
      const d = doc.data();
      if (d.name === '장민정' || d.name === '박문선') {
        console.log(`[ID: ${doc.id}] Name: ${d.name}, Phone: ${d.phone}, Last4: ${d.phoneLast4}`);
      }
    });
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
