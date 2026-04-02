const admin = require('firebase-admin');
const sa = require('./functions/service-account-key.json');
try {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
} catch (e) {
    if (e.code !== 'app/duplicate-app') throw e;
}

const db = admin.firestore();

async function checkCount() {
    const snapshot = await db.collection('studios').doc('demo-yoga').collection('daily_classes').get();
    console.log("Total daily_classes documents:", snapshot.size);
    snapshot.forEach(doc => {
       if (doc.id.includes('2026-04')) console.log("- ", doc.id);
    });
}
checkCount().catch(console.error);
