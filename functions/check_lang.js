const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkMemberLanguage() {
    try {
        const snap = await db.collection('members').where('name', '==', '송대민').get();
        if (!snap.empty) {
            const data = snap.docs[0].data();
            console.log(`Member: 송대민, Language: ${data.language || 'not set'}`);
        }

        const tokensSnap = await db.collection('fcm_tokens').where('memberId', '==', 'p6SHRVc5BkgbKU7i5COB').get(); // ID from previous run
        tokensSnap.docs.forEach(doc => {
            console.log(`TokenID: ${doc.id.substring(0, 10)}..., Language: ${doc.data().language || 'not set'}`);
        });

    } catch (err) {
        console.error(err);
    }
}

checkMemberLanguage();
