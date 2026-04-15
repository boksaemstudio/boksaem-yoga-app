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
        
    let count = 0;
    snap.forEach(d => {
        const data = d.data();
        if (data.className !== '마이솔' && count < 3) {
            console.log(`[OTHER] ${data.memberName}: time=${data.timestamp?.toDate()}, date='${data.date}', classTime='${data.classTime}'`);
            count++;
        }
    });

}
checkDetails().catch(console.error).finally(()=>process.exit(0));
