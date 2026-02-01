const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./functions/service-account-key.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkToken() {
    console.log('Searching for member 7073 (Kang Kyung-ah)...');
    const snapshot = await db.collection('members').where('phone', '==', '010-7313-7073').get();

    if (snapshot.empty) {
        console.log('Member not found.');
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Member ID: ${doc.id}`);
        console.log(`Name: ${data.name}`);
        console.log(`Push Enabled: ${data.pushEnabled}`);
        console.log(`FCM Token: ${data.fcmToken ? (data.fcmToken.substring(0, 20) + '...') : 'None'}`);
        console.log(`Token Last Updated: ${data.lastTokenUpdate ? data.lastTokenUpdate.toDate() : 'Unknown'}`);

        // Check fcm_tokens collection as well if you use it
        db.collection('fcm_tokens').where('memberId', '==', doc.id).get().then(tokenSnap => {
            console.log(`\nFound ${tokenSnap.size} tokens in fcm_tokens collection:`);
            tokenSnap.forEach(tDoc => {
                const tData = tDoc.data();
                console.log(`- Doc ID: ${tDoc.id}`);
                console.log(`  Token: ${tData.token ? tData.token.substring(0, 20) + '...' : 'MISSING'}`);
                console.log(`  FCM Token (Legacy): ${tData.fcmToken ? tData.fcmToken.substring(0, 20) + '...' : 'MISSING'}`);
                console.log(`  Updated: ${tData.lastUpdated ? tData.lastUpdated.toDate() : 'Unknown'}`);
                console.log(`  Platform: ${tData.platform || 'Unknown'}`);
            });
        });
    });
}

checkToken();
