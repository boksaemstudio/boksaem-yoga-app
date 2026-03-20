const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // Fix for Node 17+ IPv6 resolution timeout issues with Firestore

const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

(async () => {
  try {
    console.log('Querying TTC members...');
    const snapshot = await db.collection('studios/boksaem-yoga/members').where('membershipType', '==', 'ttc').get();
    
    console.log(`TTC 회원 ${snapshot.size}명:`);
    snapshot.forEach(doc => {
      const m = doc.data();
      console.log(`  - ${m.name} (${m.phone}) [${m.homeBranch || 'N/A'}] | credits: ${m.credits} | end: ${m.endDate}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
