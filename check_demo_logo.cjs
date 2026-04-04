const admin = require("firebase-admin");
try { admin.initializeApp(); } catch(e){}
const db = admin.firestore();

async function run() {
    const doc = await db.doc("studios/demo-yoga").get();
    if (!doc.exists) { console.log("demo-yoga doc NOT FOUND"); return; }
    const d = doc.data();
    console.log("IDENTITY:", JSON.stringify(d?.IDENTITY, null, 2));
    console.log("OG_IMAGE LOGO_URL:", d?.IDENTITY?.LOGO_URL || "NOT SET");
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
