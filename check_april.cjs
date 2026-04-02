const admin = require('firebase-admin');
const sa = require('./functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    const snaps = await db.collection('studios/demo-yoga/daily_classes').where('branchId', '==', 'main').where('date', '>=', '2026-04-01').where('date', '<=', '2026-04-31').get();
    console.log(`APRIL CLASSES: ${snaps.size}`);
    snaps.forEach(doc => {
       console.log(doc.id, '->', JSON.stringify(doc.data().classes[0]));
    });
    process.exit(0);
}
run();
