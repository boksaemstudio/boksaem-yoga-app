import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '../service-account-key.json';
let serviceAccount;

try {
    serviceAccount = require(serviceAccountPath);
} catch (e) {
    console.warn(`Warning: Could not load service account from ${serviceAccountPath}`, e.message);
}

if (!admin.apps.length) {
    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        admin.initializeApp();
    }
}

async function listAdmins() {
    console.log("=== ADMIN USER DIAGNOSIS START ===");
    try {
        const result = await admin.auth().listUsers(100);
        result.users.forEach(user => {
            const hasClaims = user.customClaims && Object.keys(user.customClaims).length > 0;
            if (user.email || hasClaims) {
                console.log(`UID: ${user.uid}`);
                console.log(` - Email: ${user.email || 'ANONYMOUS'}`);
                console.log(` - Claims: ${JSON.stringify(user.customClaims || {})}`);
                if (hasClaims) console.log(` [CLAIM FOUND]`);
                console.log('---');
            }
        });
    } catch (e) {
        console.error("Failed to list users:", e);
    }
    console.log("=== ADMIN USER DIAGNOSIS COMPLETE ===");
}

listAdmins().catch(console.error);
