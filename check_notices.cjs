const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'functions', 'service-account-key.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'boksaem-yoga'
  });
}

const db = admin.firestore();

async function checkNotices() {
  console.log('=== Finding ALL studio IDs and their notices ===\n');
  
  // List all studios
  const studiosSnap = await db.collection('studios').listDocuments();
  console.log(`Found ${studiosSnap.length} studios:`);
  
  for (const studioRef of studiosSnap) {
    console.log(`\n📂 Studio: ${studioRef.id}`);
    
    // Check notices subcollection
    try {
      const noticesSnap = await db.collection(`studios/${studioRef.id}/notices`).get();
      console.log(`   📝 notices: ${noticesSnap.size} documents`);
      noticesSnap.docs.forEach(doc => {
        const d = doc.data();
        console.log(`      - ${doc.id}: "${d.title}" (${d.date || d.timestamp || 'no date'})`);
      });
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
  }
}

checkNotices().then(() => process.exit(0));
