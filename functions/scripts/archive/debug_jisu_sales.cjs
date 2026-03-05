const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'service-account-key.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkMember() {
    const mems = await db.collection('members').where('name', '==', '김지수').get();
    for (const doc of mems.docs) {
        console.log("MEMBER ID:", doc.id);
        const sales = await db.collection('sales').where('memberId', '==', doc.id).get();
        sales.forEach(s => {
            console.log("SALE:", s.id, JSON.stringify(s.data(), null, 2));
        });
    }
}

checkMember().then(() => {
    setTimeout(() => process.exit(0), 1000);
});
