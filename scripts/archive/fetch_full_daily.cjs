const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "boksaem-yoga"
    });
}

const db = admin.firestore();

async function checkDailyDoc(branchId, date) {
    const docId = `${branchId}_${date}`;
    console.log(`Checking doc: ${docId}`);
    const docSnap = await db.collection('daily_classes').doc(docId).get();
    if (docSnap.exists) {
        console.log(JSON.stringify(docSnap.data(), null, 2));
    } else {
        console.log(`Doc ${docId} NOT FOUND`);
    }
}

async function run() {
    await checkDailyDoc('gwangheungchang', '2026-02-15');
    console.log('---');
    await checkDailyDoc('mapo', '2026-02-15');
    process.exit(0);
}

run();
