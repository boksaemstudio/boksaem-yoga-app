const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, limit, doc, getDoc } = require('firebase/firestore');
const config = require('./src/studioConfig.js').STUDIO_CONFIG;
require('dotenv').config();

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

async function debugData() {
    try {
        console.log("Searching for user '송대민'...");
        const membersRef = collection(db, 'members');
        const q = query(membersRef, where('name', '==', '송대민'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log("No member found with name '송대민'");
            return;
        }

        const memberDoc = snapshot.docs[0];
        const memberId = memberDoc.id;
        const memberData = memberDoc.data();
        console.log(`Found member: ${memberData.name} (ID: ${memberId})`);
        console.log("Member Data:", JSON.stringify(memberData, null, 2));

        console.log("\nChecking attendance records for this memberId...");
        const attendanceRef = collection(db, 'attendance');
        // Query by memberId
        const qAttendance = query(attendanceRef, where('memberId', '==', memberId));
        const attendanceSnap = await getDocs(qAttendance);

        console.log(`Found ${attendanceSnap.size} attendance records with memberId field.`);

        if (attendanceSnap.empty) {
            console.log("Checking if 'userId' or 'userName' is used instead...");
            // Try listing a few attendance records to see the schema
            const qSample = query(attendanceRef, limit(3));
            const sampleSnap = await getDocs(qSample);
            sampleSnap.forEach(doc => {
                console.log("Sample Attendance Doc:", doc.id, doc.data());
            });

            // Try searching by name just in case
            const qName = query(attendanceRef, where('userName', '==', '송대민'));
            const nameSnap = await getDocs(qName);
            console.log(`Found ${nameSnap.size} records by userName '송대민'`);
        } else {
            attendanceSnap.forEach(doc => {
                console.log(`- ${doc.id}: ${doc.data().date} / ${doc.data().timestamp}`);
            });
        }

    } catch (error) {
        console.error("Error during debug:", error);
    }
}

debugData();
