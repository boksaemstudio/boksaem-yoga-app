import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

// Hardcoded from src/firebase.js
const firebaseConfig = {
    apiKey: "AIzaSyCTjDayI1tiZO15eynRzKqrDK3TKj3D-yw",
    authDomain: "boksaem-yoga.firebaseapp.com",
    projectId: "boksaem-yoga",
    storageBucket: "boksaem-yoga.firebasestorage.app",
    messagingSenderId: "638854766032",
    appId: "1:638854766032:web:db6b919068aaf5808b2dd5"
};

console.log("Firebase Config (Hardcoded):", { projectId: firebaseConfig.projectId });

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
        console.log(`Querying attendance for memberId: ${memberId}`);
        const qSimple = query(attendanceRef, where('memberId', '==', memberId));
        const snapSimple = await getDocs(qSimple);
        console.log(`[Test 1] Found ${snapSimple.size} records with JUST memberId filter.`);

        // Test 2: Composite filter (used in app)
        try {
            const qComposite = query(attendanceRef, where('memberId', '==', memberId), orderBy('timestamp', 'desc'), limit(50));
            const snapComposite = await getDocs(qComposite);
            console.log(`[Test 2] Found ${snapComposite.size} records with Combined filter (memberId + timestamp desc).`);
            snapComposite.docs.forEach(d => {
                console.log(` - ${d.id}: ${d.data().date} type=${d.data().type} timestamp=${d.data().timestamp}`);
            });
        } catch (e) {
            console.error("[Test 2] Failed! Likely MISSING INDEX.");
            console.error(e.message);
            if (e.message.includes("index")) {
                console.log("Please create the index using the link in the error above.");
            }
        }

    } catch (error) {
        console.error("Error during debug:", error);
    }
}

debugData();
