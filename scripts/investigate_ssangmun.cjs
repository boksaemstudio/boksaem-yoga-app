const admin = require('firebase-admin');
const acc = require('./functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(acc) });

async function investigate() {
    const db = admin.firestore();

    const ssangmunSnap = await db.doc('studios/ssangmun-yoga').get();
    const demoSnap = await db.doc('studios/demo-yoga').get();
    const registrySnap = await db.doc('platform/registry/studios/ssangmun-yoga').get();

    console.log("=== SSANGMUN REGISTRY ===");
    if (registrySnap.exists) {
        console.log(JSON.stringify(registrySnap.data(), null, 2));
    } else {
        console.log("SSANGMUN REGISTRY NOT FOUND");
    }

    console.log("\n=== SSANGMUN CONFIG (IDENTITY & THEME) ===");
    if (ssangmunSnap.exists) {
        const data = ssangmunSnap.data();
        console.log(JSON.stringify({ IDENTITY: data.IDENTITY, THEME: data.THEME }, null, 2));
        console.log("PRICE SETTING IN CONFIG?", data.PRICING ? "YES" : "NO");
    }

    console.log("\n=== DEMO CONFIG (IDENTITY & THEME) ===");
    if (demoSnap.exists) {
        const data = demoSnap.data();
        console.log(JSON.stringify({ IDENTITY: data.IDENTITY, THEME: data.THEME }, null, 2));
        console.log("PRICE SETTING IN DEMO CONFIG?", data.PRICING ? "YES" : "NO");
    }

    const ssangmunPriceSnap = await db.collection('studios/ssangmun-yoga/settings').doc('pricing').get();
    const demoPriceSnap = await db.collection('studios/demo-yoga/settings').doc('pricing').get();

    console.log("\n=== SSANGMUN PRICING DOC ===");
    if (ssangmunPriceSnap.exists) {
        console.log(JSON.stringify(ssangmunPriceSnap.data(), null, 2).substring(0, 300) + '...');
    } else {
        console.log("NO SSANGMUN PRICING DOC");
    }

    console.log("\n=== DEMO PRICING DOC ===");
    if (demoPriceSnap.exists) {
        console.log(JSON.stringify(demoPriceSnap.data(), null, 2).substring(0, 300) + '...');
    } else {
        console.log("NO DEMO PRICING DOC");
    }
}

investigate().catch(console.error);
