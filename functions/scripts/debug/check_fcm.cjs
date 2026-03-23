const admin = require('firebase-admin');
// Use default credentials (gcloud auth)
admin.initializeApp({ projectId: 'boksaem-yoga' });
const db = admin.firestore();

(async () => {
    const snap = await db.collection('studios/boksaem-yoga/fcm_tokens').get();
    console.log('Total tokens:', snap.size);
    
    for (const doc of snap.docs) {
        const d = doc.data();
        const upd = d.updatedAt ? (d.updatedAt._seconds ? new Date(d.updatedAt._seconds * 1000).toISOString().slice(0,16) : 'N/A') : 'N/A';
        console.log(`${d.role||'?'} | inst:${d.instructorName||'-'} | mid:${(d.memberId||'-').substring(0,10)} | upd:${upd} | tok:${doc.id.substring(0,20)}...`);
    }
    
    console.log('\n--- Dry-run validation ---');
    for (const doc of snap.docs) {
        const d = doc.data();
        const label = d.instructorName || d.memberId || '?';
        try {
            await admin.messaging().send({ token: doc.id, notification: { title: 't', body: 'b' } }, true);
            console.log(`OK  | ${d.role||'?'} | ${label}`);
        } catch (e) {
            console.log(`FAIL| ${e.code} | ${d.role||'?'} | ${label}`);
        }
    }
    process.exit(0);
})();
