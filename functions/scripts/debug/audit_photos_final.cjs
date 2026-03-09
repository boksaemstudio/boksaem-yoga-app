
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('c:/Users/boksoon/./.gemini/antigravity/scratch/yoga-app/functions/service-account-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function auditPhotoData() {
  console.log('Starting data audit...');
  const membersSnapshot = await db.collection('members').where('isActive', '==', true).get();
  const activeMembers = membersSnapshot.docs;
  const totalActive = activeMembers.length;

  if (totalActive === 0) {
    console.log('No active members found.');
    return;
  }

  // Find unique member IDs who have a photoUrl in any attendance record
  // Note: We'll query in chunks if needed, but for audit we can just check recent ones or a sample
  // Better: look at the members themselves if they have a photoUrl field (if we added it there before)
  // Actually, photos are currently in attendance records only.
  
  const attendanceSnapshot = await db.collection('attendance')
    .where('photoUrl', '!=', null)
    .get();
  
  const memberIdsWithPhotos = new Set();
  attendanceSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.memberId) {
      memberIdsWithPhotos.add(data.memberId);
    }
  });

  const activeWithPhotos = activeMembers.filter(doc => memberIdsWithPhotos.has(doc.id)).length;
  const percentage = (activeWithPhotos / totalActive * 100).toFixed(1);

  console.log(`\n--- DATA AUDIT RESULT ---`);
  console.log(`Total Active Members: ${totalActive}`);
  console.log(`Active Members with Photos: ${activeWithPhotos}`);
  console.log(`Photo Data Percentage: ${percentage}%`);
  console.log(`-------------------------\n`);
}

auditPhotoData().catch(err => {
    console.error('Audit failed:', err);
    process.exit(1);
});
