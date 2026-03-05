const admin = require('firebase-admin');
const path = require('path');
const serviceAccountPath = path.resolve(__dirname, '../service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
const db = admin.firestore();

async function run() {
    try {
        await db.collection('sales').doc('MYY0hxQwhH5rchNXRNcF').delete();
        console.log('Deleted duplicate sales record: MYY0hxQwhH5rchNXRNcF');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
