const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = require('./service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkDetails() {
    console.log('--- Checking Notices Push Status ---');
    const notices = await db.collection('notices').orderBy('createdAt', 'desc').limit(2).get();
    notices.forEach(doc => {
        const data = doc.data();
        console.log(`Notice: ${data.title}`);
        console.log(`PushStatus:`, data.pushStatus);
    });

    console.log('\n--- Checking Messages Push Status ---');
    const msgs = await db.collection('messages').orderBy('createdAt', 'desc').limit(2).get();
    msgs.forEach(doc => {
        const data = doc.data();
        console.log(`Msg to: ${data.memberName}`);
        console.log(`PushStatus:`, data.pushStatus);
    });
    
    console.log('\n--- Checking FCM Token Count ---');
    const tokens = await db.collection('fcm_tokens').get();
    console.log(`Total active tokens in fcm_tokens: ${tokens.size}`);
}

checkDetails();
