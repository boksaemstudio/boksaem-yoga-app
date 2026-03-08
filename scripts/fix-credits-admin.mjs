import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(readFileSync("c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/functions/service-account-key.json", "utf8"));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function fixCredits() {
  console.log("=== RETROACTIVE CREDIT FIX START ===\n");

  const targetNames = ['최인해', '김호정', '허향무', '황선영ttc7기'];
  
  for (const name of targetNames) {
    const q = await db.collection('members').where('name', '==', name).get();
    if (!q.empty) {
      const doc = q.docs[0];
      const current = doc.data().credits || 0;
      console.log(`Fixing credit for ${name} (${doc.id}): ${current} -> ${current - 1}`);
      await doc.ref.update({ credits: FieldValue.increment(-1) });
    } else {
      console.log(`Member not found: ${name}`);
    }
  }

  console.log("\n=== RETROACTIVE CREDIT FIX END ===");
}

fixCredits().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
