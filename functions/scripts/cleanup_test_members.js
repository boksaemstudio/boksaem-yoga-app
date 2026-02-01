const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

// Initialize
try {
    const serviceAccount = require('../service-account.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Initialized with service-account.json');
} catch (e) {
    console.log('No service account found, using default credentials');
    admin.initializeApp();
}

const db = getFirestore();

async function cleanup() {
    console.log('Searching for test members...');
    try {
        const snapshot = await db.collection('members')
            .where('name', '>=', '중복테스트')
            .where('name', '<=', '중복테스트\uf8ff')
            .get();

        if (snapshot.empty) {
            console.log('No test members found.');
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            console.log(`Deleting ${doc.id} (${doc.data().name})`);
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log('Cleanup complete.');
    } catch (error) {
        console.error('Error cleaning up:', error);
        process.exit(1);
    }
}

cleanup();
