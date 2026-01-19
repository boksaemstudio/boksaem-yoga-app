import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCTjDayI1tiZO15eynRzKqrDK3TKj3D-yw",
    authDomain: "boksaem-yoga.firebaseapp.com",
    projectId: "boksaem-yoga",
    storageBucket: "boksaem-yoga.firebasestorage.app",
    messagingSenderId: "638854766032",
    appId: "1:638854766032:web:db6b919068aaf5808b2dd5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkData() {
    try {
        const q = query(collection(db, 'members'), limit(5));
        const snapshot = await getDocs(q);
        console.log(`Found ${snapshot.size} members (limit 5). Total size reported in snapshot? no, just size of docs.`);
        snapshot.forEach(doc => {
            console.log(doc.id, doc.data().name);
        });

        const q2 = query(collection(db, 'daily_classes'), limit(5));
        const snapshot2 = await getDocs(q2);
        console.log(`Found ${snapshot2.size} daily_classes.`);
        snapshot2.forEach(doc => {
            console.log(doc.id);
        });

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkData();
