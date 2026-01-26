const admin = require('firebase-admin');
if (admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

async function deleteCollection(collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}

async function main() {
    console.log("Starting log deletion...");

    console.log("Deleting 'ai_error_logs'...");
    await deleteCollection('ai_error_logs', 100);
    console.log("Done.");

    console.log("Deleting 'error_logs'...");
    await deleteCollection('error_logs', 100);
    console.log("Done.");

    console.log("All requested logs deleted.");
}

main().catch(err => {
    console.error("Deletion failed:", err);
    process.exit(1);
});
