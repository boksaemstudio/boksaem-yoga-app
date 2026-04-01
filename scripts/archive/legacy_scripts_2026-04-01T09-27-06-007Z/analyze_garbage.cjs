const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: 'boksaem-yoga'
    });
}
const db = admin.firestore();

async function analyze() {
    console.log("=== 1. Checking Root Collections ===");
    const collections = await db.listCollections();
    const collNames = collections.map(c => c.id);
    console.log("Root Collections:", collNames.join(', '));

    console.log("\n=== 2. Checking Studios ===");
    const studiosSnap = await db.collection('studios').get();
    const validStudios = ['demo-yoga', 'ssangmun-yoga', 'boksaem-yoga'];
    const allStudios = [];
    studiosSnap.forEach(doc => allStudios.push(doc.id));
    
    console.log("All Studios:", allStudios.join(', '));
    const toDelete = allStudios.filter(id => !validStudios.includes(id));
    console.log("Studios to potentially delete:", toDelete.join(', '));

    console.log("\n=== 3. Checking Legacy Root Collections Count ===");
    const legacy = ['branches', 'members', 'attendance', 'daily_classes', 'monthly_schedules', 'notices', 'settings', 'pricing', 'images'];
    for (const l of legacy) {
        if (collNames.includes(l)) {
            const snap = await db.collection(l).limit(1).get();
            if (!snap.empty) {
                console.log(`- Legacy [${l}]: Has documents!`);
            }
        }
    }
    process.exit(0);
}

analyze().catch(e => {
    console.error(e);
    process.exit(1);
});
