const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkErrorLogs() {
  console.log('Checking server error logs...\n');
  
  const logsRef = db.collection('error_logs');
  const snapshot = await logsRef.orderBy('timestamp', 'desc').limit(50).get();

  if (snapshot.empty) {
    console.log('✅ No error logs found. System is healthy!');
    return;
  }

  console.log(`Found ${snapshot.size} error logs:\n`);
  
  snapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    const timestamp = data.timestamp ? new Date(data.timestamp).toLocaleString('ko-KR') : 'No timestamp';
    
    console.log(`${index + 1}. [${timestamp}]`);
    console.log(`   Type: ${data.errorType || 'Unknown'}`);
    console.log(`   Message: ${data.message || 'No message'}`);
    console.log(`   User: ${data.userId || 'Anonymous'}`);
    if (data.stack) {
      console.log(`   Stack: ${data.stack.substring(0, 100)}...`);
    }
    console.log('');
  });
}

checkErrorLogs().catch(console.error);
