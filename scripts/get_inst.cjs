const admin = require('firebase-admin');
const sa = require('c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    console.log("Fetching Mapo 2026-03 schedule...");
    const snap = await db.collection('studios').doc('boksaem-yoga').collection('monthly_schedules').doc('mapo_2026_03').get();
    const data = snap.data();
    if (!data) return console.log("No data");
    
    // 3월 30일(월)
    const cls = data.classes['2026-03-30'] || data.classes['30'] || [];
    console.log("March 30th classes:");
    cls.forEach(c => console.log(`${c.time} ${c.title} -> ${c.instructor}`));
    
    // 3월 2일(월)
    const cls2 = data.classes['2026-03-02'] || data.classes['02'] || [];
    console.log("March 2nd classes:");
    cls2.forEach(c => console.log(`${c.time} ${c.title} -> ${c.instructor}`));
    
    process.exit(0);
}
run().catch(console.error);
