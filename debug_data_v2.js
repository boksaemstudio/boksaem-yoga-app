import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Manual .env parser
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envFile.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                env[key.trim()] = value.trim();
            }
        });
        return env;
    } catch (e) {
        console.error("Could not read .env file:", e);
        return {};
    }
}

const env = loadEnv();

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID
};

console.log("Firebase Config (Partial):", { projectId: firebaseConfig.projectId });

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugData() {
    try {
        console.log("1. Searching for user '송대민'...");
        const membersRef = collection(db, 'members');
        const q = query(membersRef, where('name', '==', '송대민'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log("No member found with name '송대민'");
            // List a few members to see names
            const sample = await getDocs(query(membersRef, limit(3)));
            console.log("Sample members:", sample.docs.map(d => d.data().name));
            return;
        }

        const memberDoc = snapshot.docs[0];
        const memberId = memberDoc.id;
        const memberData = memberDoc.data();
        console.log(`Found member: ${memberData.name} (ID: ${memberId})`);

        console.log("\n2. Checking attendance records for this memberId...");
        const attendanceRef = collection(db, 'attendance');

        // Test 1: Simple filters
        const qSimple = query(attendanceRef, where('memberId', '==', memberId));
        const snapSimple = await getDocs(qSimple);
        console.log(`[Test 1] Found ${snapSimple.size} records with JUST memberId filter.`);

        // Test 2: Composite filter (used in app)
        try {
            const qComposite = query(attendanceRef, where('memberId', '==', memberId), orderBy('timestamp', 'desc'));
            const snapComposite = await getDocs(qComposite);
            console.log(`[Test 2] Found ${snapComposite.size} records with Combined filter (memberId + timestamp desc).`);
            snapComposite.docs.forEach(d => {
                console.log(` - ${d.data().date} (${d.data().className}): ${d.data().timestamp}`);
            });
        } catch (e) {
            console.error("[Test 2] Failed! Likely MISSING INDEX.");
            console.error(e.message);
        }

    } catch (error) {
        console.error("Error during debug:", error);
    }
}

debugData();
