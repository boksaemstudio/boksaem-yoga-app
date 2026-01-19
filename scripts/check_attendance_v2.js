const admin = require('firebase-admin');

// Service account is not available here, so we might need to use the public config if supported by a library,
// but usually we use admin SDK on server.
// Let's try to use the public firebase package but with proper error handling.
// Or just use 'firebase' npm package.

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyCTjDayI1tiZO15eynRzKqrDK3TKj3D-yw",
    authDomain: "boksaem-yoga.firebaseapp.com",
    projectId: "boksaem-yoga",
    storageBucket: "boksaem-yoga.firebasestorage.app",
    messagingSenderId: "638854766032",
    appId: "1:638854766032:web:db6b919068aaf5808b2dd5"
};

async function run() {
    try {
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        console.log("Fetching all attendance...");
        const q = query(collection(db, "attendance"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);

        console.log(`Total logs: ${snapshot.size}`);

        const today = new Date().toISOString().split('T')[0];
        console.log(`Filter for today: ${today}\n`);

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.timestamp.startsWith(today)) {
                console.log(`[TODAY] ${data.timestamp} - ${data.memberName} (${data.className}) [${data.branchId}] - ID: ${doc.id}`);
            } else {
                // Just log the last few to see format
                // console.log(`[OTHER] ${data.timestamp} - ${data.memberName}`);
            }
        });

    } catch (e) {
        console.error("ERROR:", e);
    }
}

run();
