
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'functions', 'service-account-key.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function deepDive() {
  console.log('--- Deep Dive: Duplicate Attendance & AI Errors ---');

  // 1. Duplicate Attendance Detail
  const memberId = 'mvA0leUDiAe47dxLDt59';
  const date = '2026-02-18';
  console.log(`\nInspecting member ${memberId} on ${date}...`);
  
  const memberSnap = await db.collection('members').doc(memberId).get();
  if (memberSnap.exists) {
      console.log(`Member Name: ${memberSnap.data().name}, Credits: ${memberSnap.data().credits}, AttendanceCount: ${memberSnap.data().attendanceCount}`);
  }

  const logsSnap = await db.collection('attendance')
    .where('memberId', '==', memberId)
    .where('date', '==', date)
    .get();
  
  logsSnap.forEach(doc => {
      console.log(`Log ID: ${doc.id}, Data:`, JSON.stringify(doc.data(), null, 2));
  });

  // 2. Inspect AI Error Log Details
  console.log('\nInspecting AI Error Log details...');
  const aiErrorSnap = await db.collection('ai_error_logs').orderBy('timestamp', 'desc').limit(5).get();
  aiErrorSnap.forEach(doc => {
      console.log(`Log ID: ${doc.id}, Raw Data:`, JSON.stringify(doc.data(), null, 2));
  });

  console.log('--- Deep Dive End ---');
}

deepDive().catch(console.error);
