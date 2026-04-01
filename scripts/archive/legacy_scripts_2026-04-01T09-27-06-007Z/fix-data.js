import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(readFileSync("c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/functions/service-account-key.json", "utf8"));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function fixIntegrity() {
  console.log("=== DATA INTEGRITY FIX START ===\n");

  // 1. Fix Negative Credits for 신보영 (jxyUdLYzDnuN7Mh25GUg)
  // Set to 0 if it's -1
  const memberId = 'jxyUdLYzDnuN7Mh25GUg';
  console.log(`Fixing credits for member ${memberId}...`);
  await db.collection('members').doc(memberId).update({ credits: 0 });
  console.log(`Updated credits to 0 for ${memberId}.`);

  // 2. Fix Duplicate Attendance (gIsgOR28kMaVkQ8zOThf)
  // I'll delete this specific document as it was identified as a potential duplicate.
  const attId = 'gIsgOR28kMaVkQ8zOThf';
  console.log(`Deleting duplicate attendance ${attId}...`);
  await db.collection('attendance').doc(attId).delete();
  console.log(`Deleted attendance record ${attId}.`);

  console.log("\n=== DATA INTEGRITY FIX END ===");
}

fixIntegrity().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
