
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'functions', 'service-account-key.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function auditData() {
  console.log('--- Data Integrity Audit Start ---');

  // 1. Check for Negative Credits
  console.log('\nChecking for negative credits...');
  const negativeCreditsSnap = await db.collection('members')
    .where('credits', '<', 0)
    .get();

  if (negativeCreditsSnap.empty) {
    console.log('✅ No members found with negative credits.');
  } else {
    console.log(`❌ Found ${negativeCreditsSnap.size} members with negative credits:`);
    negativeCreditsSnap.forEach(doc => {
      const data = doc.data();
      console.log(`- Member: ${data.name} (${doc.id}), Credits: ${data.credits}`);
    });
  }

  // 2. Check for Duplicate Attendance (in the last 24 hours)
  console.log('\nChecking for duplicate attendance (last 24h)...');
  const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const attendanceSnap = await db.collection('attendance')
    .where('timestamp', '>=', past24h)
    .get();

  const logsByMemberDateClass = {}; // memberId_date_className -> [logs]
  const duplicates = [];

  attendanceSnap.forEach(doc => {
    const data = doc.data();
    if (data.status === 'denied') return; // Skip denied ones

    const key = `${data.memberId}_${data.date}_${data.className}`;
    if (!logsByMemberDateClass[key]) {
      logsByMemberDateClass[key] = [];
    }
    logsByMemberDateClass[key].push({ id: doc.id, ...data });
  });

  for (const key in logsByMemberDateClass) {
    if (logsByMemberDateClass[key].length > 1) {
      duplicates.push({ key, logs: logsByMemberDateClass[key] });
    }
  }

  if (duplicates.length === 0) {
    console.log('✅ No duplicate attendance found for the last 24h.');
  } else {
    console.log(`❌ Found ${duplicates.length} potential duplicates in the last 24h:`);
    duplicates.forEach(d => {
      console.log(`- Key: ${d.key}`);
      d.logs.forEach(l => {
        console.log(`  * ID: ${l.id}, Timestamp: ${l.timestamp}, Instructor: ${l.instructor}`);
      });
    });
  }

  console.log('\n--- AI Error Logs Check ---');
  const aiErrorSnap = await db.collection('ai_error_logs').limit(10).get();
  if (aiErrorSnap.empty) {
    console.log('✅ No recent AI error logs.');
  } else {
    console.log(`⚠️ Found ${aiErrorSnap.size} recent AI error logs (showing 10):`);
    aiErrorSnap.forEach(doc => {
       const d = doc.data();
       console.log(`- [${d.timestamp || 'N/A'}] ${d.errorType || 'Unknown'}: ${d.errorMessage || 'No message'}`);
    });
  }

  console.log('\n--- Client Error Logs Check ---');
  const errorSnap = await db.collection('error_logs').limit(10).get();
  if (errorSnap.empty) {
    console.log('✅ No recent client error logs.');
  } else {
    console.log(`⚠️ Found ${errorSnap.size} recent client error logs:`);
    errorSnap.forEach(doc => {
       const d = doc.data();
       console.log(`- [${d.timestamp || 'N/A'}] ${d.source || 'Unknown'}: ${d.message || 'No message'}`);
    });
  }

  console.log('\n--- FCM Token Check ---');
  const tokensSnap = await db.collection('fcm_tokens').get();
  const tokensByUser = {};
  tokensSnap.forEach(doc => {
      const d = doc.data();
      const uid = d.memberId || d.userId || 'unknown';
      if (!tokensByUser[uid]) tokensByUser[uid] = 0;
      tokensByUser[uid]++;
  });

  let heavyUsers = 0;
  for (const uid in tokensByUser) {
      if (tokensByUser[uid] > 5) {
          console.log(`⚠️ User ${uid} has ${tokensByUser[uid]} tokens.`);
          heavyUsers++;
      }
  }
  if (heavyUsers === 0) console.log('✅ FCM token counts per user are healthy.');

  console.log('\n--- Data Integrity Audit End ---');
}

auditData().catch(console.error);
