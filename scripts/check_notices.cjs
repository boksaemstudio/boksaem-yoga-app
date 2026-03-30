const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    // 1. Check recent notices in boksaem-yoga
    console.log("=== boksaem-yoga notices ===");
    const noticeSnap = await db.collection('studios/boksaem-yoga/notices').get();
    console.log(`Total notices: ${noticeSnap.size}`);
    noticeSnap.forEach(d => {
        const data = d.data();
        console.log(`  [${d.id}] ${data.title} | ${data.createdAt} | author: ${data.author || 'none'}`);
    });

    // 2. Check recent push_history in boksaem-yoga  
    console.log("\n=== boksaem-yoga push_history (last 10) ===");
    const phSnap = await db.collection('studios/boksaem-yoga/push_history')
        .orderBy('createdAt', 'desc').limit(10).get();
    console.log(`Total push_history fetched: ${phSnap.size}`);
    phSnap.forEach(d => {
        const data = d.data();
        const ts = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}) : data.createdAt;
        console.log(`  [${d.id}] type:${data.type} | ${data.title || data.body?.substring(0,30)} | ${ts} | status:${data.status}`);
    });

    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
