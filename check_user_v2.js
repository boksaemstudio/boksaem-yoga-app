import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkMember(name, phone) {
    try {
        console.log(`\n--- Searching for Member: ${name} (${phone}) ---`);
        const membersRef = collection(db, 'members');
        const q = query(membersRef, where('name', '==', name));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log(`❌ No member found with name '${name}'`);
            return;
        }

        let found = false;
        snapshot.forEach(doc => {
            const data = doc.data();
            const phoneLast4 = data.phone ? data.phone.slice(-4) : '';
            if (phoneLast4 === phone || !phone) {
                found = true;
                console.log(`✅ Found member: ${data.name} (ID: ${doc.id})`);
                console.log("Data:", JSON.stringify(data, null, 2));
            }
        });

        if (!found) {
            console.log(`❌ Member '${name}' exists but phone last 4 digits do not match.`);
        }

        console.log(`\n--- Recent Error Logs (ai_error_logs) ---`);
        const logsRef = collection(db, 'ai_error_logs');
        const qLogs = query(logsRef, orderBy('timestamp', 'desc'), limit(10));
        const logSnap = await getDocs(qLogs);
        
        logSnap.forEach(doc => {
            const log = doc.data();
            console.log(`[${log.timestamp?.toDate ? log.timestamp.toDate().toISOString() : log.timestamp}] ${log.name || 'Unknown'}: ${log.error || log.message}`);
        });

    } catch (error) {
        console.error("Error:", error);
    }
}

const name = process.argv[2] || "백현경";
const phone = process.argv[3] || "9044";
checkMember(name, phone);
