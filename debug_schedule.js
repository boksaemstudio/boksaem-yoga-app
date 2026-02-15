
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { config } from "dotenv";

config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkSchedule() {
    const today = "2026-02-15";
    const branches = ["gwangheungchang", "mapo"];
    const instructorName = "효원";

    console.log(`Checking schedule for date: ${today}`);

    for (const branchId of branches) {
        const docId = `${branchId}_${today}`;
        const docRef = doc(db, "daily_classes", docId);
        
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log(`\n[${branchId}] Document exists.`);
                const classes = data.classes || [];
                console.log(`Total classes: ${classes.length}`);
                
                const myClasses = classes.filter(c => c.instructor.includes(instructorName) || instructorName.includes(c.instructor));
                if (myClasses.length > 0) {
                    console.log(`Found classes for ${instructorName}:`);
                    myClasses.forEach(c => console.log(` - ${c.time} ${c.title} (${c.instructor}) [Status: ${c.status || 'active'}]`));
                } else {
                    console.log(`No classes found for ${instructorName}.`);
                    console.log("All classes:", classes.map(c => `${c.time} ${c.title} (${c.instructor})`));
                }
            } else {
                console.log(`\n[${branchId}] Document ${docId} does NOT exist.`);
            }
        } catch (error) {
            console.error(`Error fetching ${docId}:`, error);
        }
    }
}

checkSchedule();
