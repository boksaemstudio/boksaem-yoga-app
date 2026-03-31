const admin = require('firebase-admin');
const sa = require('./functions/service-account-key.json');
if(!admin.apps.length) admin.initializeApp({credential: admin.credential.cert(sa)});
const db = admin.firestore();

async function q() {
    try {
        const snap = await db.collection('studios/boksaem-yoga/attendance')
            .where('memberId', '==', 'kOR52ZEFBWUmuC7IfSZg')
            .orderBy('timestamp', 'desc')
            .get();
        console.log(`SUCCESS: Got ${snap.size} logs`);
    } catch(e) {
        if (e.message.includes('index')) {
            console.log("INDEX ERROR DETECTED!");
        }
        console.error(`ERROR:`, e.details || e.message);
    }
    process.exit(0);
}
q();
