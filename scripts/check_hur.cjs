const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function checkDetails() {
    const tenantDb = db.collection('studios').doc('boksaem-yoga');
    
    const hmm = await tenantDb.collection('attendance').where('memberName', '==', '허향무').get();
    console.log("허향무 모든 출석 기록:");
    hmm.forEach(d => {
        let tsField = d.data().timestamp;
        let type = typeof tsField;
        if (tsField && typeof tsField.toDate === 'function') {
            type = 'Firestore Timestamp: ' + tsField.toDate().toISOString();
        } else {
            type = type + ': ' + tsField;
        }
        console.log(`[${d.id}] date: ${d.data().date}, timestamp type: ${type}`);
    });

}
checkDetails().catch(console.error).finally(()=>process.exit(0));
