const admin = require('firebase-admin');
const serviceAccount = require(process.cwd() + '/functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'boksaem-yoga.firebasestorage.app'
    });
}

async function setLifecycle() {
    try {
        const bucket = admin.storage().bucket();
        // Set lifecycle rules to purge files under 'attendance_photos/' matching age 60
        const metadata = {
            lifecycle: {
                rule: [
                    {
                        action: { type: 'Delete' },
                        condition: {
                            age: 60,
                            matchesPrefix: ['attendance_photos/']
                        }
                    }
                ]
            }
        };

        console.log("Setting lifecycle metadata...");
        await bucket.setMetadata(metadata);
        console.log("✅ Lifecycle configuration successfully updated for 'boksaem-yoga.firebasestorage.app'");
        
        const [getMeta] = await bucket.getMetadata();
        console.log("Current Lifecycle Rules:", JSON.stringify(getMeta.lifecycle, null, 2));

    } catch (error) {
        console.error("❌ Failed to set lifecycle rules:", error);
    }
}

setLifecycle();
