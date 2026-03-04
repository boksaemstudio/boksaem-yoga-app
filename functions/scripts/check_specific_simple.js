const admin = require('firebase-admin');
const path = require('path');
const serviceAccountPath = path.resolve(__dirname, '../service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
const db = admin.firestore();

async function run() {
    try {
        const memRef = await db.collection('members').doc('SwagRQBqMAOODaRSPm4j').get();
        console.log("MEMBER:");
        if (memRef.exists) console.log(memRef.data().regDate, memRef.data().amount, memRef.data().name);

        console.log("\nSALES:");
        const sales = await db.collection('sales').where('memberId', '==', 'SwagRQBqMAOODaRSPm4j').get();
        sales.docs.forEach(doc => {
            console.log(doc.id, doc.data().date, doc.data().amount, doc.data().itemName || doc.data().item);
        });
    } catch(e) {
        console.error(e);
    }
}
run();
