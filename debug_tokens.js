import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
// Load env
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);
// config({ path: resolve(__dirname, '.env') });


const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyCTjDayI1tiZO15eynRzKqrDK3TKj3D-yw",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "boksaem-yoga.firebaseapp.com",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "boksaem-yoga",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTokens() {
    console.log("Checking FCM Tokens...");
    try {
        const q = query(collection(db, 'fcm_tokens'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log("No tokens found in 'fcm_tokens' collection.");
        } else {
            console.log(`Found ${snapshot.size} tokens.`);
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`Token ID (partial): ${doc.id.substring(0, 10)}... | MemberId: ${data.memberId} | UpdatedAt: ${data.updatedAt}`);
            });
        }
    } catch (error) {
        console.error("Error fetching tokens:", error);
    }
}

checkTokens();
