const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

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
  console.log("Starting comprehensive log deletion...");

  const collections = [
      'ai_error_logs',
      'error_logs', 
      'audit_logs',
      'meditation_ai_logs',
      'system_stats'
  ];

  for (const col of collections) {
      console.log(`Deleting '${col}'...`);
      try {
        await deleteCollection(col, 100);
        console.log(`Deleted '${col}'.`);
      } catch (e) {
          console.error(`Error deleting '${col}':`, e.message);
      }
  }

  console.log("All requested logs deleted.");
}

main().catch(console.error);
