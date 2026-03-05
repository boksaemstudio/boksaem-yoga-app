const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function countCollection(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).count().get();
    console.log(`${collectionName}: ${snapshot.data().count}`);
  } catch (e) {
    if (e.message.includes('NOT_FOUND')) {
      // count() might not be supported if the admin sdk is old, fallback to getting all docs (warning: expensive)
      // or just list first 1 to see if it exists
      console.log(`${collectionName}: Error counting (might be empty or permission issue) - ${e.message}`);
    } else {
        // Fallback for older admin SDKs that don't support count()
        try {
            const snap = await db.collection(collectionName).select().get();
            console.log(`${collectionName}: ${snap.size}`);
        } catch(e2) {
            console.log(`${collectionName}: Error counting - ${e2.message}`);
        }
    }
  }
}

async function checkQuota() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    
    console.log(`\n--- Checking AI Quota ---`);
    for (const date of [today, yesterday]) {
        try {
            const doc = await db.collection('ai_quota').doc(date).get();
            if (doc.exists) {
                console.log(`[${date}] Count: ${doc.data().count}, LastUpdated: ${doc.data().lastUpdated?.toDate()}`);
            } else {
                console.log(`[${date}] No quota document found.`);
            }
        } catch (e) {
            console.log(`[${date}] Error fetching quota: ${e.message}`);
        }
    }
}

async function checkStats() {
  console.log('--- AI Log Counts ---');
  await countCollection('ai_usage');
  await countCollection('ai_error_logs');
  await checkQuota();
}

checkStats().catch(console.error);
