const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function listCollections() {
  console.log('Listing all Firestore collections...');
  const collections = await db.listCollections();
  if (collections.length === 0) {
    console.log('No collections found.');
    return;
  }
  
  console.log('Collections:');
  for (const collection of collections) {
    console.log(`- ${collection.id}`);
  }
}

listCollections().catch(console.error);
