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
            
        console.log(`Found ${snap.size} logs. Rebuilding...`);
        for (const doc of snap.docs) {
            const data = doc.data();
            
            // Delete old weird doc
            await doc.ref.delete();
            
            // Re-create perfectly
            const cleanData = {
                ...data,
                // Ensure timestamp is uniform ISO or ServerTimestamp
                timestamp: typeof data.timestamp === 'string' ? data.timestamp : new Date().toISOString(),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('studios/boksaem-yoga/attendance').add(cleanData);
            console.log(`Re-added perfectly formatted record for ${data.className}`);
        }
        
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
