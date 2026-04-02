const admin = require('firebase-admin');

// Initialize Firebase Admin (assuming default credentials work here)
const firebaseConfig = require('./firebase.json'); // not for admin, just checking existence
const sa = require('./functions/service-account-key.json');
try {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
} catch (e) {
    if (e.code !== 'app/duplicate-app') throw e;
}

const db = admin.firestore();

async function checkClasses() {
    console.log("Checking classes for demo-yoga...");
    const snapshot = await db.collection('studios').doc('demo-yoga').collection('daily_classes').limit(5).get();
    
    if (snapshot.empty) {
        console.log("NO CLASSES FOUND IN daily_classes!");
    } else {
        snapshot.forEach(doc => {
            console.log("Class ID:", doc.id);
            console.log("Class Data:", JSON.stringify(doc.data(), null, 2));
        });
    }
}

checkClasses().catch(console.error);
