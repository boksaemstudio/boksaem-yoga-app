const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    try {
        console.log("Searching broadly for fake notice messages...");
        const msgSnap = await db.collection('studios/boksaem-yoga/messages').get();
        let deleted = 0;
        for (const doc of msgSnap.docs) {
            const dataStr = JSON.stringify(doc.data());
            if (dataStr.includes('3월 한정') || dataStr.includes('모닝 빈야사')) {
                console.log('Deleting:', doc.id);
                await doc.ref.delete();
                deleted++;
            }
        }
        console.log(`Deleted ${deleted} fake messages.`);
    } catch(e) { console.error(e); }
    process.exit(0);
}
run();
