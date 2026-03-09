const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./service-account-key.json'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

async function run() {
    try {
        console.log("Fetching members...");
        const snap = await db.collection('members').get();
        let found = [];
        snap.forEach(doc => {
            const d = doc.data();
            if (d.name === '장민정' || d.name === '박문선') {
                found.push({id: doc.id, name: d.name, phone: d.phone, phoneLast4: d.phoneLast4, pin: d.pin});
            }
        });
        console.log(JSON.stringify(found, null, 2));
    } catch(e) {
        console.error("Error:", e);
    }
    process.exit(0);
}
run();
