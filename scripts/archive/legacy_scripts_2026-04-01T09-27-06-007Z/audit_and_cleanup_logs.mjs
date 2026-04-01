import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/functions/service-account-key.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function deleteCollection(collectionPath, batchSize = 100) {
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

async function auditAndCleanup() {
    console.log("=== SERVER LOG AUDIT & CLEANUP ===");
    
    const collections = ['error_logs', 'ai_error_logs', 'ai_request_logs'];
    
    for (const collName of collections) {
        console.log(`\n>>> Auditing [${collName}]...`);
        const snapshot = await db.collection(collName).limit(10).get();
        
        if (snapshot.empty) {
            console.log(`✅ [${collName}] is already empty.`);
        } else {
            console.log(`⚠️ [${collName}] has data. Latest entries:`);
            snapshot.forEach(doc => {
                const data = doc.data();
                const ts = data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp;
                console.log(`- [${ts}] ${data.message || data.error || 'No message'}`);
            });
            
            console.log(`Deleting all documents in [${collName}]...`);
            await deleteCollection(collName);
            console.log(`✅ [${collName}] cleaned up.`);
        }
    }
}

auditAndCleanup().catch(console.error);
