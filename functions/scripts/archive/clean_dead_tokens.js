const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = require('./service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function cleanupTokens() {
    console.log('--- Cleaning up FCM Tokens (Dry Run) ---');
    try {
        const snap = await db.collection('fcm_tokens').get();
        const tokens = [];
        const tokenDocs = {};
        snap.forEach(doc => {
            tokens.push(doc.id);
            tokenDocs[doc.id] = doc.ref;
        });

        console.log(`Testing ${tokens.length} tokens...`);
        
        let invalidCount = 0;
        const chunkSize = 500;
        const batch = db.batch();

        for (let i = 0; i < tokens.length; i += chunkSize) {
            const chunk = tokens.slice(i, i + chunkSize);
            const response = await admin.messaging().sendEachForMulticast({
                tokens: chunk,
                notification: { title: "Test", body: "Test" },
                android: { notification: { color: "#000000" } }
            }, true); // dryRun = true
            
            response.responses.forEach((res, idx) => {
                if (!res.success && 
                    (res.error?.code === 'messaging/invalid-registration-token' ||
                     res.error?.code === 'messaging/registration-token-not-registered')) {
                    batch.delete(tokenDocs[chunk[idx]]);
                    invalidCount++;
                }
            });
        }

        if (invalidCount > 0) {
            await batch.commit();
            console.log(`Deleted ${invalidCount} invalid/dead tokens.`);
        } else {
            console.log(`No invalid tokens found.`);
        }

        const remain = await db.collection('fcm_tokens').get();
        console.log(`Remaining active tokens: ${remain.size}`);

    } catch (e) {
        console.error(e);
    }
}

cleanupTokens();
