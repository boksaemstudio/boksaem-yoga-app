const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkRecentMessages() {
    try {
        console.log("Tallying recent messages sent in the last 30 minutes...");
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const snapshot = await db.collection('messages')
            .where('createdAt', '>=', thirtyMinsAgo)
            .get();
        
        let total = 0;
        let success = 0;
        let tooManyRequests = 0;
        let otherErrors = 0;
        let pushSuccess = 0;
        let pushErrors = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            total++;
            
            if (data.solapiStatus) {
                if (data.solapiStatus.sent) {
                    success++;
                } else {
                    if (data.solapiStatus.error && data.solapiStatus.error.includes('TooManyRequests')) {
                        tooManyRequests++;
                    } else {
                        otherErrors++;
                        console.log("Other error:", data.solapiStatus.error);
                    }
                }
            }

            if (data.pushStatus) {
                if (data.pushStatus.sent) {
                    pushSuccess++;
                } else {
                    pushErrors++;
                }
            }
        });

        console.log('--- Summary ---');
        console.log(`Total Messages Created: ${total}`);
        console.log(`SMS/LMS Success (Solapi): ${success}`);
        console.log(`SMS/LMS Failed (TooManyRequests): ${tooManyRequests}`);
        console.log(`SMS/LMS Failed (Other): ${otherErrors}`);
        console.log(`App Push Success: ${pushSuccess}`);
        console.log(`App Push Failed: ${pushErrors}`);
        
    } catch (error) {
        console.error("Error fetching messages:", error);
    }
}

checkRecentMessages();
