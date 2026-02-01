const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkLatestNotice() {
    try {
        const snap = await db.collection('notices').orderBy('timestamp', 'desc').limit(2).get();
        if (snap.empty) {
            console.log("No notices found.");
            return;
        }

        snap.docs.forEach(doc => {
            const data = doc.data();
            console.log(`--- Notice ID: ${doc.id} ---`);
            console.log(`Title: ${data.title}`);
            console.log(`Content: ${data.content}`);
            console.log(`Timestamp: ${data.timestamp}`);
            console.log(`PushStatus:`, data.pushStatus);
        });

    } catch (err) {
        console.error(err);
    }
}

checkLatestNotice();
