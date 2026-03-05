import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Check if credentials are known or fallback
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '../service-account-key.json';
let serviceAccount;

try {
    serviceAccount = require(serviceAccountPath);
} catch (e) {
    console.warn(`Warning: Could not load service account from ${serviceAccountPath}`, e.message);
}

try {
    if (serviceAccount) {
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    } else {
        if (!admin.apps.length) {
            admin.initializeApp();
        }
    }
} catch (e) {
    console.warn("Failed to initialize admin:", e.message);
}

const db = admin.firestore();

async function findMissingEndDate() {
    console.log("=== CHECKING FOR MEMBERS WITH MISSING END DATE ===");
    try {
        const snapshot = await db.collection('members').get();
        let count = 0;
        const missingMembers = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            // Check if endDate is missing or empty string
            if (!data.endDate || data.endDate === "") {
                count++;
                missingMembers.push({
                    id: doc.id,
                    name: data.name || 'Unknown',
                    phone: data.phoneLast4 || 'No Phone',
                    startDate: data.startDate || 'No Start Date',
                    credits: data.credits
                });
            }
        });

        console.log(`\nTotal members scanned: ${snapshot.size}`);
        console.log(`Found ${count} members with missing endDate.\n`);

        if (count > 0) {
            console.log("--- List of Members ---");
            missingMembers.forEach(m => {
                console.log(`[${m.name}] (Phone: ${m.phone}) - Start: ${m.startDate}, Credits: ${m.credits}, ID: ${m.id}`);
            });
            console.log("-----------------------");
        } else {
            console.log("Good news! No members found with missing endDate.");
        }

    } catch (error) {
        console.error("Error scanning members:", error);
    }
}

findMissingEndDate();
