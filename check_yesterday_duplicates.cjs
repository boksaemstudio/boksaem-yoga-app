
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'functions', 'service-account-key.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findYesterdayDuplicates() {
  console.log('--- Finding Duplicates for 2026-02-24 ---');
  
  // Yesterday was Feb 24
  const dateStr = '2026-02-24';
  
  const attendanceSnap = await db.collection('attendance')
    .where('date', '==', dateStr)
    .get();

  const logsByMemberClass = {};
  const duplicates = [];

  attendanceSnap.forEach(doc => {
    const data = doc.data();
    if (data.status === 'denied') return;

    const key = `${data.memberId}_${data.className}`;
    if (!logsByMemberClass[key]) {
      logsByMemberClass[key] = [];
    }
    logsByMemberClass[key].push({ id: doc.id, ...data });
  });

  for (const key in logsByMemberClass) {
    if (logsByMemberClass[key].length > 1) {
      duplicates.push({ key, logs: logsByMemberClass[key] });
    }
  }

  if (duplicates.length === 0) {
    console.log('✅ No duplicate attendance found for 2026-02-24 in current DB.');
    console.log('This suggests the duplicate was already deleted as reported.');
    
    // Let's check for any trace of the deletion in history (with limit)
    console.log('\nChecking for any recent "deletion" traces in attendance_history...');
    try {
      const historyLogs = await db.collection('attendance_history')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
      historyLogs.forEach(doc => {
        const d = doc.data();
        console.log(`History: [${d.action}] Member: ${d.memberName}, Class: ${d.className}, Time: ${d.timestamp}`);
      });
    } catch (e) {
      console.log('Note: attendance_history check skipped or failed.');
    }
  } else {
    console.log(`❌ Found ${duplicates.length} potential duplicates for 2026-02-24:`);
    duplicates.forEach(d => {
      console.log(`- Member: ${d.logs[0].memberName} (${d.logs[0].memberId}), Class: ${d.logs[0].className}`);
      d.logs.forEach(l => {
        console.log(`  * ID: ${l.id}, Timestamp: ${l.timestamp}, Instructor: ${l.instructor}`);
      });
    });
  }
  
  console.log('\n--- Checking Recent Deletion in Error Logs (Limited) ---');
  try {
    const errorLogs = await db.collection('error_logs')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();
    
    errorLogs.forEach(doc => {
      const data = doc.data();
      if (data.message && (data.message.includes('Delete') || data.message.includes('삭제'))) {
        console.log('Relevant Log found:', data.timestamp, data.message);
      }
    });
  } catch (e) {
    console.log('Error logs scan failed or requires index.');
    // Fallback if index missing
    const simpleLogs = await db.collection('error_logs').limit(10).get();
    simpleLogs.forEach(doc => console.log('Log:', doc.data().message));
  }

  console.log('--- Check End ---');
}

findYesterdayDuplicates().catch(console.error);
