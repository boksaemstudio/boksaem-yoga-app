const admin = require('firebase-admin');
const serviceAccount = require('./functions/service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listQuota() {
    console.log("Listing ai_quota documents:");
    const snapshot = await db.collection('ai_quota').get();
    if (snapshot.empty) {
        console.log("No documents found in ai_quota.");
    } else {
        snapshot.forEach(doc => {
            console.log(doc.id, '=>', doc.data());
        });
    }

    console.log("\nChecking last 5 attendance logs:");
    const att = await db.collection('attendance').orderBy('timestamp', 'desc').limit(5).get();
    att.forEach(doc => {
        const d = doc.data();
        console.log(doc.id, d.memberName, d.timestamp?.toDate ? d.timestamp.toDate().toISOString() : d.timestamp);
    });
}

listQuota().catch(console.error);
