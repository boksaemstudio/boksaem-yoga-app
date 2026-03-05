const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkErrors() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    
    console.log(`Checking errors since: ${todayStr}`);
    
    const snapshot = await db.collection('error_logs')
      .where('timestamp', '>=', todayStr)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
      
    if (snapshot.empty) {
      console.log('No errors found today! 🎉');
      process.exit(0);
    }
    
    console.log(`Found ${snapshot.size} errors today:\n`);
    snapshot.forEach(doc => {
      const data = doc.data();
      const time = new Date(data.timestamp).toLocaleTimeString('ko-KR');
      console.log(`[${time}] ${data.message}`);
      if (data.url) console.log(`  URL: ${data.url}`);
      if (data.userId) console.log(`  User: ${data.userId}`);
      if (data.context) console.log(`  Context: ${JSON.stringify(data.context)}`);
      console.log('-----------------------------------');
    });
    process.exit(0);
  } catch (err) {
    console.error('Error fetching logs:', err);
    process.exit(1);
  }
}

checkErrors();
