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
            
        console.log(`Found ${snap.size} logs. Tagging them with sessionCount...`);
        
        let docs = [];
        snap.forEach(d => docs.push({ id: d.id, ref: d.ref, ...d.data() }));
        
        // Sort oldest first
        docs.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];
            const updates = {
                sessionCount: i + 1,
                isMultiSession: i > 0,
            };
            await doc.ref.update(updates);
            console.log(`Updated log ${doc.className} (${doc.timestamp}) with sessionCount: ${i + 1}`);
        }
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
