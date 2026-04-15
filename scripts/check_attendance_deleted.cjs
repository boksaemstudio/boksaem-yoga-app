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
        
    let deletedCount = 0;
    let notDeletedCount = 0;
    snap.forEach(d => {
        const data = d.data();
        if (data.className === '마이솔') {
            if (data.deletedAt) deletedCount++;
            else notDeletedCount++;
            console.log(`[${d.id}] memberName: ${data.memberName}, deletedAt: ${data.deletedAt || 'none'}`);
        }
    });
        
    console.log(`마이솔 출석 중 deletedAt 존재: ${deletedCount}건, 존재하지 않음: ${notDeletedCount}건`);
}
checkDetails().catch(console.error).finally(()=>process.exit(0));
