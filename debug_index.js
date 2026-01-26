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

async function checkAttendanceQuery() {
    console.log("Checking Attendance Query Index...");
    try {
        // Simulate the query used in getAttendanceByMemberId
        // We need a dummy memberId that likely exists or just any string
        const memberId = "dummy_member_id";

        // Attempting the exact query from storage.js
        const q = query(
            collection(db, 'attendance'),
            where('memberId', '==', memberId),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        await getDocs(q);
        console.log("Query executed successfully. Index appears to be present.");

    } catch (e) {
        console.log("Query failed!");
        console.error(e.message);
        if (e.message.includes("indexes")) {
            console.log("\n[ACTION REQUIRED] Missing Index detected needed for: memberId + timestamp DESC");
            console.log("Please check the error message for the creation link.");
        }
    }
}

checkAttendanceQuery();
