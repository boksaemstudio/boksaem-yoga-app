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
        
    const map = new Map();
    snap.forEach(d => {
        const data = d.data();
        let classTime = data.classTime;
        if (!classTime && data.timestamp) {
            const date = data.timestamp.toDate();
            const h = String(date.getHours()).padStart(2, '0');
            const m = String(date.getMinutes()).padStart(2, '0');
            classTime = `${h}:${m}`;
            // NOTE: Local time on the server might be UTC!
            // .getHours() on UTC VM gives UTC hour.
            // On the client browser, .getHours() gives KST.
        }
        const key = `${data.className}-${data.instructor}-${data.branchId}-${classTime}`;
        if (!map.has(key)) map.set(key, { count: 0, names: [], isDenied: 0 });
        
        const entry = map.get(key);
        if (data.status === 'denied') entry.isDenied++;
        else {
            entry.count++;
            entry.names.push(data.memberName);
        }
    });
        
    console.log("Client-side Key Mapping Simulation:");
    map.forEach((entry, key) => {
        if(key.includes('마이솔')) {
            console.log(`[${key}] => ${entry.count}명 (${entry.names.join(', ')})`);
        }
    });

}
checkDetails().catch(console.error).finally(()=>process.exit(0));
