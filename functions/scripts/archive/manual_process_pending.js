const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'service-account-key.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function processPendingManual() {
    console.log('=== Manual Processing of Pending Attendance ===');
    
    // Get ONE pending document
    const pendingSnap = await db.collection('pending_attendance').limit(1).get();
    
    if (pendingSnap.empty) {
        console.log('No pending documents to process.');
        return;
    }

    const doc = pendingSnap.docs[0];
    const data = doc.data();
    console.log(`Processing Doc ID: ${doc.id}`);
    console.log(`Data:`, data);

    const { memberId, branchId, classTitle, instructor, timestamp, date } = data;

    try {
        await db.runTransaction(async (transaction) => {
            const memberRef = db.collection('members').doc(memberId);
            const memberSnap = await transaction.get(memberRef);

            if (!memberSnap.exists) {
                console.error(`❌ Member not found: ${memberId}`);
                return;
            }

            const memberData = memberSnap.data();
            console.log(`✅ Member found: ${memberData.name}`);

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
                syncMode: 'manual-script'
            };

            const attRef = db.collection('attendance').doc();
            transaction.set(attRef, attendanceData);
            console.log(`Created attendance record: ${attRef.id}`);

            transaction.update(memberRef, {
                credits: admin.firestore.FieldValue.increment(-1),
                attendanceCount: admin.firestore.FieldValue.increment(1),
                lastAttendance: timestamp
            });
            console.log(`Updated member credits/count`);

            // Check if we should delete or just log (for safety, let's NOT delete in this test, just Log)
            // But to Simulate real behavior, we shoud delete. 
            // Let's delete it to clean up the queue if successful.
            transaction.delete(doc.ref);
            console.log(`Deleted pending doc`);
        });

        console.log(`✅ Successfully processed pending check-in for ${memberId}`);
    } catch (e) {
        console.error(`❌ Sync failed for ${memberId}:`, e);
    }
}

processPendingManual();
