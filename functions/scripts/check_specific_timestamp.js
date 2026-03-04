const admin = require('firebase-admin');
const path = require('path');
const serviceAccountPath = path.resolve(__dirname, '../service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
const db = admin.firestore();

async function run() {
    try {
        const s1 = await db.collection('sales').doc('MYY0hxQwhH5rchNXRNcF').get();
        const s2 = await db.collection('sales').doc('gBQI3ZkdisHCmFEXl8fJ').get();
        console.log('S1 timestamp:', s1.data()?.timestamp);
        console.log('S2 timestamp:', s2.data()?.timestamp);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
