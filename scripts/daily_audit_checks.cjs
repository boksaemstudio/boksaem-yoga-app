const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "../serviceAccountKey.json"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://yoga-pass-default-rtdb.firebaseio.com"
  });
}

const db = admin.firestore();

async function runAudit() {
  console.log("=== DAILY AUDIT CHECKS ===");
  try {
    // 1. Data Integrity: Negative credits
    let negativeCredits = 0;
    const studiosSnapshot = await db.collection("studios").get();
    for (const studio of studiosSnapshot.docs) {
      const members = await db.collection("studios").doc(studio.id).collection("members").where("credits", "<", 0).get();
      if (!members.empty) {
        negativeCredits += members.size;
        console.log(`[!] Studio ${studio.id} has ${members.size} members with negative credits.`);
      }
    }
    console.log(`- Members with negative credits: ${negativeCredits}`);

    // 2. Error Logs in last 24h
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const errorLogs = await db.collection("error_logs").where("timestamp", ">=", yesterday).get();
    console.log(`- Error logs in last 24h: ${errorLogs.size}`);

    // 3. FCM Tokens count
    const tokens = await db.collection("fcm_tokens").get();
    console.log(`- Total FCM tokens: ${tokens.size}`);

  } catch (error) {
    console.error("Error during audit checks:", error);
  } finally {
    process.exit(0);
  }
}

runAudit();
