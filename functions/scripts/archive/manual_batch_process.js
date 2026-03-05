const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'service-account-key.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function processAllPending() {
    console.log('=== Batch Processing ALL Pending Attendance ===');
    
    const pendingSnap = await db.collection('pending_attendance').get();
    
    if (pendingSnap.empty) {
        console.log('No pending documents found.');
        return;
    }

    console.log(`Found ${pendingSnap.size} pending documents.`);
    let successCount = 0;
    let failCount = 0;

    for (const doc of pendingSnap.docs) {
        const data = doc.data();
        const { memberId, branchId, classTitle, instructor, timestamp, date } = data;

        console.log(`Processing [${memberId}]...`);

        try {
            await db.runTransaction(async (transaction) => {
                const memberRef = db.collection('members').doc(memberId);
                const memberSnap = await transaction.get(memberRef);

                if (!memberSnap.exists) {
                    console.error(`❌ Member not found: ${memberId} (Doc: ${doc.id})`);
                    // Optionally delete orphan pending doc? No, keep it for investigation.
                    return; 
                }

                const memberData = memberSnap.data();
                const currentCredits = memberData.credits || 0;
                const currentCount = memberData.attendanceCount || 0;

                const attendanceData = {
                    memberId,
                    memberName: memberData.name,
                    branchId,
                    date: date,
                    className: classTitle || '자율수련',
                    instructor: instructor || '미지정',
                    timestamp: timestamp,
                    status: 'valid',
                    credits: currentCredits - 1,
                    cumulativeCount: currentCount + 1,
                    syncMode: 'manual-batch-script'
                };

                const attRef = db.collection('attendance').doc();
                transaction.set(attRef, attendanceData);

                transaction.update(memberRef, {
                    credits: admin.firestore.FieldValue.increment(-1),
                    attendanceCount: admin.firestore.FieldValue.increment(1),
                    lastAttendance: timestamp
                });

                transaction.delete(doc.ref);
            });

            console.log(` ✅ Synced: ${memberId}`);
            successCount++;
        } catch (e) {
            console.error(` ❌ Sync failed for ${memberId}:`, e);
            failCount++;
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total: ${pendingSnap.size}`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

processAllPending();
