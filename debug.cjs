const admin = require('firebase-admin');
const sa = require('./functions/service-account-key.json');
if(!admin.apps.length) admin.initializeApp({credential: admin.credential.cert(sa)});
const db = admin.firestore();

async function run() {
    try {
        const snap = await db.collection('studios/boksaem-yoga/attendance')
            .where('memberId', '==', 'kOR52ZEFBWUmuC7IfSZg')
            .where('date', '==', '2026-03-30')
            .get();
            
        console.log(`Found ${snap.size} logs for 2026-03-30`);
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`\nDoc ${doc.id}:`);
            console.log(` - timestamp:`, typeof data.timestamp, data.timestamp);
            console.log(` - deletedAt:`, data.deletedAt);
            console.log(` - status:`, data.status);
            console.log(` - All Keys:`, Object.keys(data));
        });
        
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
