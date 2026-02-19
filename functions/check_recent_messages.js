const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    const serviceAccount = require('./service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkMessages() {
    console.log('--- [Recent Messages (Last 30)] ---');
    const snapshot = await db.collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(30)
        .get();

    if (snapshot.empty) {
        console.log('No messages found.');
        return;
    }

    snapshot.forEach(doc => {
        const d = doc.data();
        console.log(`ID: ${doc.id}`);
        console.log(`  MemberId: ${d.memberId}`);
        console.log(`  Status: ${d.status}`);
        console.log(`  Content: ${d.content?.substring(0, 50)}...`);
        console.log(`  CreatedAt: ${d.createdAt}`);
        console.log(`  Error: ${d.errorMessage || d.error || 'None'}`);
        console.log('---');
    });
}

checkMessages().catch(console.error);
