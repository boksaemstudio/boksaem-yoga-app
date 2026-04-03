const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
db.collection('studios').doc('boksaem-yoga').get().then(doc => {
    console.log(JSON.stringify(doc.data().IDENTITY, null, 2));
    process.exit(0);
});
