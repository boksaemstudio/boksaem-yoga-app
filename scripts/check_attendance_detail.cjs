const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function checkDetails() {
    const tenantDb = db.collection('studios').doc('boksaem-yoga');
    
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const startOfDay = new Date(`${today}T00:00:00+09:00`);
    const endOfDay = new Date(`${today}T23:59:59+09:00`);
    
    const snap = await tenantDb.collection('attendance')
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
        .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
        .get();
        
    const mysoleLogs = [];
    snap.forEach(d => {
        const data = d.data();
        if (data.className === '마이솔') mysoleLogs.push({id: d.id, ...data});
    });
        
    console.log(`오늘 마이솔 출석 상세 (${mysoleLogs.length}건):`);
    mysoleLogs.slice(0, 3).forEach(d => {
        console.log(`[${d.id}] memberName: ${d.memberName}, instructor: ${d.instructor}, date: ${d.date}`);
        console.log(`   time:`, d.timestamp?.toDate());
        console.log(`   full data:`, d);
    });
}
checkDetails().catch(console.error).finally(()=>process.exit(0));
