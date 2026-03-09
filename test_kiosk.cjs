const { initializeApp } = require('firebase/app');
const { getFirestore, getDoc, doc } = require('firebase/firestore');

const app = initializeApp({ projectId: 'boksaem-yoga' });
const db = getFirestore(app);

async function run() {
  const s1 = await getDoc(doc(db, 'settings', 'kiosk'));
  const s2 = await getDoc(doc(db, 'settings', 'kiosk_gwangheungchang'));
  const s3 = await getDoc(doc(db, 'settings', 'kiosk_mapo'));
  console.log('all:', s1.data());
  console.log('gwang:', s2.data());
  console.log('mapo:', s3.data());
  process.exit(0);
}

run();
