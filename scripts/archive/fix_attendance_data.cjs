const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize with service account
const serviceAccountPath = path.join(__dirname, 'functions/service-account-key.json');
if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    if (admin.apps.length === 0) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
} else {
    if (admin.apps.length === 0) admin.initializeApp();
}

const db = admin.firestore();

async function fixData() {
    console.log('--- Fixing Kim Hee-jung Data ---');
    const today = '2026-02-15';
    
    // 1. Get Member
    const khjSnap = await db.collection('members').where('phoneLast4', '==', '6017').get();
    if (khjSnap.empty) { console.log('Member not found'); return; }
    
    const memberDoc = khjSnap.docs[0];
    const memberId = memberDoc.id;
    console.log(`Member: ${memberDoc.data().name} (${memberId})`);

    // 2. Get Attendance
    const attSnap = await db.collection('attendance')
        .where('memberId', '==', memberId)
        .where('date', '==', today)
        .get();
    
    // Sort by timestamp
    const records = attSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    console.log(`Found ${records.length} records.`);

    if (records.length < 2) {
        console.log('Not enough records to fix duplicates. Configuring class name only if needed.');
         // Even if single record, fix class name if it's currently '자율수련'
        if (records.length === 1 && records[0].className === '자율수련') {
             await db.collection('attendance').doc(records[0].id).update({ className: '하타 인텐시브' });
             console.log('Updated class name to [하타 인텐시브]');
        }
        return;
    }

    // 3. Prepare Batch
    const batch = db.batch();

    // Keep the FIRST record, Delete others
    const keepRecord = records[0];
    const duplicates = records.slice(1);
    
    console.log(`Keeping: ${keepRecord.id} (${keepRecord.timestamp})`);
    
    // Update the kept record's class name
    batch.update(db.collection('attendance').doc(keepRecord.id), {
        className: '하타 인텐시브',
        credits: 13, // Snap status at that time (approximate, simpler to just fix member credits)
        sessionNumber: 1
    });

    duplicates.forEach(rec => {
        console.log(`Deleting: ${rec.id} (${rec.timestamp})`);
        batch.delete(db.collection('attendance').doc(rec.id));
    });

    // 4. Fix Member Credits
    // Deduct 1 for the valid attendance, Refund 2 duplicates
    // Current credits: 11 (from inspection)
    // Should be: 13 (Started 14 -> -1 = 13)
    // The inspection showed Credits: 11, so we add 2.
    // Also fix count: currently 3 -> should be 1 higher than clean start?
    
    // Let's rely on increment for safety
    batch.update(db.collection('members').doc(memberId), {
        credits: admin.firestore.FieldValue.increment(2), // Refund 2
        attendanceCount: admin.firestore.FieldValue.increment(-2) // Reduce count by 2
    });

    await batch.commit();
    console.log('SUCCESS: Fixed duplicates, updated class name, and refunded credits.');
}

fixData().catch(console.error);
