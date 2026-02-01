const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkSongMessages() {
    try {
        const memberId = 'p6SHRVc5BkgbKU7i5COB';
        const msgSnap = await db.collection('messages')
            .where('memberId', '==', memberId)
            .get();

        console.log(`--- Messages for 송대민 ---`);
        if (msgSnap.empty) {
            console.log("No messages found.");
        } else {
            const logs = msgSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            logs.slice(0, 5).forEach(log => {
                console.log(`ID: ${log.id}, Content: ${log.content}, Timestamp: ${log.timestamp}`);
            });
        }

    } catch (err) {
        console.error(err);
    }
}

checkSongMessages();
