
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import fs from 'fs';
import path from 'path';

// Manual .env loading
try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
        console.log("Loaded .env file");
    } else {
        console.warn(".env file not found");
    }
} catch (e) {
    console.error("Error loading .env:", e);
}

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

console.log("Firebase Config Project ID:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function checkSchedule() {
    try {
        await signInAnonymously(auth);
        console.log("Signed in anonymously");
    } catch (e) {
        console.error("Sign in failed:", e);
        process.exit(1);
    }
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
    process.exit(0);
}

checkSchedule();
