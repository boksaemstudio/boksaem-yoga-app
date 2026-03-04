const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(process.cwd(), 'functions/service-account-key.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    try {
        const snap = await db.collection('members').where('name', '==', '김지수').get();
        if (snap.empty) {
            console.log('No such member');
            return;
        }
        const memberId = snap.docs[0].id;
        console.log('Member ID:', memberId);

        const salesSnap = await db.collection('sales').where('memberId', '==', memberId).get();
        salesSnap.forEach(doc => {
            console.log('Sale:', doc.id, JSON.stringify(doc.data(), null, 2));
        });
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
