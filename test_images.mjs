import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const app = initializeApp({ projectId: "boksaem-yoga" });
const db = getFirestore(app);

async function run() {
  const snapshot = await getDocs(collection(db, "images"));
  console.log("Found " + snapshot.docs.length + " images.");
  snapshot.docs.forEach((doc) => {
    console.log("ID: " + doc.id);
    const data = doc.data();
    if (data.url) console.log("  URL: " + data.url.substring(0, 100) + "...");
    if (data.base64) console.log("  Base64: " + data.base64.substring(0, 50) + "...");
  });
  process.exit(0);
}

run().catch(console.error);
