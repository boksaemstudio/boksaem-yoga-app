import admin from 'firebase-admin';
import fs from 'fs';
const serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf8'));
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
const doc = await db.collection('studios').doc('boksaem-yoga').get();
console.log(JSON.stringify(doc.data().IDENTITY, null, 2));
process.exit(0);
