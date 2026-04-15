const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function checkDetails() {
    const tenantDb = db.collection('studios').doc('boksaem-yoga');
    
    // 1. Fetch exactly like setupAttendanceListener
    const snap = await tenantDb.collection('attendance')
        .orderBy('timestamp', 'desc').limit(1000).get();
        
    const logs = [];
    snap.forEach(d => logs.push({ id: d.id, ...d.data() }));

    console.log("total logs fetched limit 1000:", logs.length);
    const heohyangmu = logs.find(l => l.memberName === '허향무');
    console.log("허향무 in last 1000?", !!heohyangmu);
    if (heohyangmu) {
        console.log("timestamp:", heohyangmu.timestamp);
    } else {
        // Let's get him specifically
        const hmm = await tenantDb.collection('attendance').where('memberName', '==', '허향무').get();
        const docs = [];
        hmm.forEach(d => docs.push(d.data()));
        console.log("허향무 specific query timestamps:", docs.map(d=>d.timestamp));
        
        let oldestIn1000 = logs[logs.length-1].timestamp;
        console.log("oldest timestamp in 1000:", oldestIn1000);
    }
}
checkDetails().catch(console.error).finally(()=>process.exit(0));
