import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(readFileSync("c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/functions/service-account-key.json", "utf8"));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function inspectConfig() {
    console.log("=== 🔍 INSPECTING LIVE CLOUD CONFIG ===");
    
    const studioDoc = await db.collection('studios').doc('default').get();
    
    if (!studioDoc.exists) {
        console.log("❌ Studio config 'default' not found in Firestore.");
        return;
    }
    
    const config = studioDoc.data();
    console.log("STUDIO NAME:", config.IDENTITY?.NAME);
    console.log("\n--- ASSETS ---");
    console.log(JSON.stringify(config.ASSETS, null, 2));
    
    console.log("\n--- THEME ---");
    console.log(JSON.stringify(config.THEME, null, 2));

    const backgroundKeys = Object.keys(config.ASSETS?.BACKGROUNDS || {});
    console.log("\nChecking Background Paths:");
    backgroundKeys.forEach(k => {
        const path = config.ASSETS.BACKGROUNDS[k];
        if (path.startsWith('http')) {
            console.log(`✅ ${k}: Remote URL (${path.slice(0, 50)}...)`);
        } else if (path.startsWith('/assets/')) {
            console.log(`❌ ${k}: LOCAL PATH DETECTED (${path}) - This will break in production if public/assets is missing.`);
        } else {
            console.log(`❓ ${k}: ${path}`);
        }
    });

}

inspectConfig().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
