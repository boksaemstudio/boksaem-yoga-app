const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "../functions/service-account-key.json"));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function seedRegistry() {
    console.log("Seeding Registry...");
    const studios = [
        {
            id: "boksaem-yoga",
            name: "복샘요가",
            nameEnglish: "Boksaem Yoga",
            ownerEmail: "biksoon@daum.net",
            plan: "pro",
            status: "active"
        },
        {
            id: "demo-yoga",
            name: "ZenFlow Yoga (DEMO)",
            nameEnglish: "ZenFlow Yoga",
            ownerEmail: "demo@passflow.kr",
            plan: "pro",
            status: "active"
        },
        {
            id: "ssangmun-yoga",
            name: "쌍문요가",
            nameEnglish: "Ssangmun Yoga",
            ownerEmail: "admin@ssangmun.kr",
            plan: "basic",
            status: "active"
        }
    ];

    for (const studio of studios) {
        const ref = db.collection("platform/registry/studios").doc(studio.id);
        const docSnap = await ref.get();
        if (!docSnap.exists) {
            await ref.set({
                name: studio.name,
                nameEnglish: studio.nameEnglish,
                ownerEmail: studio.ownerEmail,
                plan: studio.plan,
                status: studio.status,
                createdAt: new Date().toISOString(),
                memberCount: 0
            });
            console.log(`[+] Added ${studio.id} to registry.`);
        } else {
            console.log(`[=] ${studio.id} already exists in registry.`);
        }
    }
    console.log("Done.");
}

seedRegistry().then(() => process.exit(0)).catch(console.error);
