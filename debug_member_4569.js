
import admin from "firebase-admin";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const serviceAccount = require("./functions/service-account-key.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkMember() {
  console.log("Searching for member with phoneLast4: 4569");
  
  // 1. Try phoneLast4
  let snapshot = await db.collection('members').where('phoneLast4', '==', '4569').get();
  
  if (snapshot.empty) {
    console.log("No member found with phoneLast4 == 4569. Trying phone suffix...");
    // 2. Try scanning all members (slow but effective for debugging)
    const allMembers = await db.collection('members').get();
    const matches = allMembers.docs.filter(doc => {
        const data = doc.data();
        return data.phone && data.phone.endsWith('4569');
    });
    
    if (matches.length === 0) {
        console.log("No member found with phone ending in 4569.");
        return;
    }
    
    console.log(`Found ${matches.length} members by suffix scan.`);
    matches.forEach(doc => printMember(doc));
  } else {
    console.log(`Found ${snapshot.size} members by phoneLast4 index.`);
    snapshot.forEach(doc => printMember(doc));
  }
}

function printMember(doc) {
    const data = doc.data();
    console.log(`\n[ID: ${doc.id}]`);
    console.log(JSON.stringify(data, null, 2));
    
    // Check for weird values
    if (data.credits === Infinity || data.credits === -Infinity) console.error("!!! CREDITS IS INFINITY !!!");
    if (Number.isNaN(data.credits)) console.error("!!! CREDITS IS NaN !!!");
    
    if (data.streak === Infinity) console.error("!!! STREAK IS INFINITY !!!");
}

checkMember().catch(console.error);
