/* eslint-env node */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./functions/service-account-key.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkSongDaeMin() {
    console.log('Searching for member Song Dae-min...');
    // Assuming name is key, but phone is safer if known. I'll search by name first.
    const snapshot = await db.collection('members').where('name', '==', '송대민').get();

    if (snapshot.empty) {
        console.log('Member "Song Dae-min" not found.');
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`\nMember ID: ${doc.id}`);
        console.log(`Name: ${data.name}`);
        console.log(`Phone: ${data.phone}`);
        console.log(`Push Enabled: ${data.pushEnabled}`);
        console.log(`FCM Token (in member doc): ${data.fcmToken ? (data.fcmToken.substring(0, 20) + '...') : 'MISSING'}`);

        // Check fcm_tokens collection
        db.collection('fcm_tokens').where('memberId', '==', doc.id).get().then(tokenSnap => {
            console.log(`Found ${tokenSnap.size} tokens in fcm_tokens collection:`);
            tokenSnap.forEach(tDoc => {
                const tData = tDoc.data();
                console.log(`- Token: ${tData.token ? tData.token.substring(0, 20) + '...' : 'MISSING'}`);
                console.log(`  Updated: ${tData.lastUpdated ? tData.lastUpdated.toDate() : 'Unknown'}`);
            });
        });
    });
}

checkSongDaeMin();
