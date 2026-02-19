
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'functions', 'service-account-key.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fullSystemAudit() {
  const now = new Date();
  const past24h = new Date(now - 24 * 60 * 60 * 1000);
  const past24hISO = past24h.toISOString();

  console.log(`--- Full System Audit Start (Target: Last 24h, Since ${past24hISO}) ---`);

  // 1. Check Attendance Success/Failure Ratio
  console.log('\n[1. Attendance Stats]');
  const attendanceSnap = await db.collection('attendance')
    .where('timestamp', '>=', past24hISO)
    .get();
  
  let valid = 0, denied = 0, manual = 0;
  attendanceSnap.forEach(doc => {
      const d = doc.data();
      if (d.status === 'denied') denied++;
      else if (d.status === 'valid') valid++;
      if (d.syncMode === 'manual' || d.type === 'manual') manual++;
  });
  console.log(`- Total Logs: ${attendanceSnap.size}`);
  console.log(`- Success (Valid): ${valid}`);
  console.log(`- Denied/Failed: ${denied}`);
  console.log(`- Manual Adjustments: ${manual}`);

  // 2. Critical Attendance Errors (Denied Reasons)
  if (denied > 0) {
      console.log('\n[2. Denied Attendance Detail]');
      attendanceSnap.forEach(doc => {
          const d = doc.data();
          if (d.status === 'denied') {
              console.log(`- [${d.timestamp}] Member: ${d.memberName || d.memberId}, Reason: ${d.denialReason || 'Unknown'}`);
          }
      });
  }

  // 3. Pending Attendance (Kiosk Sync Issues)
  console.log('\n[3. Kiosk Sync Status]');
  const pendingSnap = await db.collection('pending_attendance').get();
  if (pendingSnap.empty) {
      console.log('✅ All Kiosk data synced (No pending attendance).');
  } else {
      console.log(`⚠️ Alert: ${pendingSnap.size} records are pending sync! (Tablet might be offline or Cloud Function failed)`);
      pendingSnap.forEach(doc => {
          const d = doc.data();
          console.log(`- ID: ${doc.id}, Date: ${d.date}, Name: ${d.memberName}`);
      });
  }

  // 4. Server/Client Error Logs (Last 24h)
  console.log('\n[4. Error Logs Analysis]');
  const errorSnap = await db.collection('error_logs')
    .where('timestamp', '>=', past24hISO)
    .get();
  
  if (errorSnap.empty) {
      console.log('✅ No critical errors reported in the last 24h.');
  } else {
      console.log(`⚠️ Found ${errorSnap.size} errors in the last 24h:`);
      errorSnap.forEach(doc => {
          const d = doc.data();
          console.log(`- [${d.source || 'Client'}] ${d.message}`);
      });
  }

  // 5. AI Server Health
  console.log('\n[5. AI & Automation Status]');
  const aiErrorSnap = await db.collection('ai_error_logs')
    .where('timestamp', '>=', past24h) // Note: ai_error_logs might use Firestore Timestamp
    .get();
  
  if (aiErrorSnap.empty) {
      console.log('✅ AI processes running smoothly.');
  } else {
      console.log(`⚠️ Found ${aiErrorSnap.size} AI-related issues.`);
  }

  // 6. Push Notification Health
  const fcmSnap = await db.collection('push_history').limit(5).orderBy('timestamp', 'desc').get();
  console.log('\n[6. Push Notification History (Recent 5)]');
  fcmSnap.forEach(doc => {
      const d = doc.data();
      console.log(`- [${d.timestamp?.toDate ? d.timestamp.toDate().toISOString() : d.timestamp}] Status: ${d.status}, Type: ${d.title}`);
  });

  console.log('\n--- Full System Audit End ---');
}

fullSystemAudit().catch(console.error);
