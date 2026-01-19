const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyCTjDayI1tiZO15eynRzKqrDK3TKj3D-yw",
    authDomain: "boksaem-yoga.firebaseapp.com",
    projectId: "boksaem-yoga",
    storageBucket: "boksaem-yoga.firebasestorage.app",
    messagingSenderId: "638854766032",
    appId: "1:638854766032:web:db6b919068aaf5808b2dd5"
};

async function checkNotices() {
    try {
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        console.log("Fetching all notices...");
        const snapshot = await getDocs(collection(db, "notices"));

        console.log(`Total notices: ${snapshot.size}`);
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`- [${doc.id}] Title: ${data.title}, Date: ${data.date}`);
        });
    } catch (e) {
        console.error("ERROR:", e);
    }
}

checkNotices();
