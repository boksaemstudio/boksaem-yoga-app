const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const acc = require('../functions/service-account-key.json');

initializeApp({ credential: cert(acc) });
const db = getFirestore();

async function run() {
  const tdb = db.collection('studios').doc('boksaem-yoga');
  const startOfToday = new Date('2026-03-28T15:00:00.000Z'); // KST 00:00 is UTC 15:00 of previous day
  const snap = await tdb.collection('push_history').where('createdAt', '>=', startOfToday).get();
  
  const results = [];
  snap.forEach(d => {
    const dt = d.data();
    results.push({ 
      id: d.id, 
      time: dt.createdAt?.toDate().toISOString(), 
      type: dt.type, 
      memberData: dt.targetMemberName || dt.memberName, 
      title: dt.title 
    });
  });
  
  results.sort((a,b) => (a.time || '').localeCompare(b.time || ''));
  console.log('--- push_history sorted by time ---');
  results.forEach(r => console.log(r));

  console.log('\n--- messages created today ---');
  const mSnap = await tdb.collection('messages').where('timestamp', '>=', startOfToday.toISOString()).get();
  mSnap.forEach(d => {
      const dt = d.data();
      console.log(d.id, dt.timestamp, dt.memberId);
  });
  process.exit(0);
}

run().catch(console.error);
