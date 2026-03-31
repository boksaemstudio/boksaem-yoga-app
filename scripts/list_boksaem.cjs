const admin = require('firebase-admin');

const serviceAccount = require('../functions/service-account-key.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function list() {
    const snapshot = await db.collection('platform').doc('registry').collection('studios').get();
    console.log('--- 모든 스튜디오 명단 ---');
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`[${doc.id}] -> 이름: ${data.name}`);
    });
}

list().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
