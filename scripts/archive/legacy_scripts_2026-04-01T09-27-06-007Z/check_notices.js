import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";

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

async function checkNotices() {
    console.log("Checking notices in Firestore...\n");

    const q = query(collection(db, "notices"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);

    console.log(`Found ${snapshot.size} notices:\n`);
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}`);
        console.log(`Title: ${data.title}`);
        console.log(`Date: ${data.date}`);
        console.log(`Content: ${data.content?.substring(0, 100)}...`);
        console.log(`Has Image: ${!!data.image}`);
        console.log('---');
    });
}

checkNotices().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
