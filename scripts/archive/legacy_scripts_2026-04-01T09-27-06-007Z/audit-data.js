import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";

// Load service account from the absolute path to be sure
const serviceAccount = JSON.parse(readFileSync("c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/functions/service-account-key.json", "utf8"));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkIntegrity() {
  console.log("=== DATA INTEGRITY ADMIN AUDIT START ===\n");

  console.log('--- Checking for Negative Credits ---');
  const membersSnap = await db.collection('members').where('credits', '<', 0).get();
  if (membersSnap.empty) {
    console.log('No members with negative credits found.');
  } else {
    membersSnap.forEach(doc => {
      console.log(`[!] Member ${doc.id} (${doc.data().name}) has ${doc.data().credits} credits.`);
    });
  }

  console.log('\n--- Checking for FCM Token Counts ---');
  const collections = ['fcm_tokens', 'fcmTokens', 'push_tokens'];
  const tokenCountsByMember = {};

  for (const col of collections) {
    try {
      const snap = await db.collection(col).get();
      snap.forEach(doc => {
        const data = doc.data();
        if (data.memberId) {
          tokenCountsByMember[data.memberId] = (tokenCountsByMember[data.memberId] || 0) + 1;
        }
      });
    } catch (e) {
      console.warn(`Collection ${col} not found or inaccessible.`);
    }
  }
  
  let highTokenCount = 0;
  Object.entries(tokenCountsByMember).forEach(([memberId, count]) => {
    if (count >= 10) {
      console.log(`[!] Member ${memberId} has ${count} total tokens across all collections.`);
      highTokenCount++;
    }
  });
  if (highTokenCount === 0) console.log('No members with excessive tokens (>=10).');

  console.log('\n--- Checking for Duplicate Attendance (Today) ---');
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  const attSnap = await db.collection('attendance').where('date', '==', today).get();
  const seen = new Set();
  let duplicateCount = 0;
  attSnap.forEach(doc => {
    const data = doc.data();
    const key = `${data.memberId}_${data.className}_${data.date}`;
    if (seen.has(key)) {
      console.log(`[!] Possible duplicate attendance: ${doc.id} for member ${data.memberId} in class ${data.className}`);
      duplicateCount++;
    }
    seen.add(key);
  });
  if (duplicateCount === 0) console.log('No duplicate attendance records found for today.');

  console.log("\n=== DATA INTEGRITY ADMIN AUDIT END ===");
}

checkIntegrity().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
