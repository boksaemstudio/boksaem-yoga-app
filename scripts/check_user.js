
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

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

async function checkUser() {
    console.log("Checking for user: 송대민 / 5876");

    // Check by phoneLast4
    const q1 = query(collection(db, "members"), where("phoneLast4", "==", "5876"));
    const snapshot1 = await getDocs(q1);

    console.log(`Found ${snapshot1.size} users with phone 5876:`);
    snapshot1.forEach(doc => {
        console.log(" - ", doc.data().name, doc.data().phone, doc.data().phoneLast4);
    });

    // Check by name
    const q2 = query(collection(db, "members"), where("name", "==", "송대민"));
    const snapshot2 = await getDocs(q2);

    console.log(`Found ${snapshot2.size} users with name 송대민:`);
    snapshot2.forEach(doc => {
        console.log(" - ", doc.data().name, doc.data().phone, doc.data().phoneLast4);
    });
}

checkUser().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
