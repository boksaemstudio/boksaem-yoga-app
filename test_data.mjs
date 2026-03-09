import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

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
const auth = getAuth(app);

async function run() {
  try {
    const userCredential = await signInAnonymously(auth);
    console.log("Signed in anonymously as: ", userCredential.user.uid);
    
    console.log("\n--- Checking Images ---");
    const snapshot = await getDocs(collection(db, "images"));
    console.log("Found " + snapshot.docs.length + " images.");
    snapshot.docs.forEach((doc) => {
      console.log("ID: " + doc.id);
      const data = doc.data();
      if (data.url) console.log("  URL: " + data.url.substring(0, 100) + "...");
    });
    
    console.log("\n--- Checking Member 2789 ---");
    const memSnap = await getDocs(collection(db, "members"));
    const members = [];
    memSnap.docs.forEach(doc => {
      members.push({ id: doc.id, ...doc.data() });
    });
    const target = members.filter(m => m.phone && m.phone.endsWith('2789'));
    console.log('Member 2789 found:', target.map(m => ({ id: m.id, name: m.name, phone: m.phone, status: m.status, credits: m.credits })));

  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

run().catch(console.error);
