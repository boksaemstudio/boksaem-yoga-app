const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'service-account-key.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function testOfflineSync() {
    console.log('=== Test: Offline Auto-Sync (Cloud Function) ===');

    // 1. Find a test member (e.g., admin or any real member to update credits safely)
    // We will use a known ID or find one. Let's find one.
    const memberSnap = await db.collection('members').limit(1).get();
    if (memberSnap.empty) {
        console.error('No members found for testing.');
        return;
    }
    const member = memberSnap.docs[0];
    const memberId = member.id;
    const memberName = member.data().name;
    console.log(`Target Member: ${memberName} (${memberId})`);
    
    // 2. Create a dummy pending document
    const pendingRef = db.collection('pending_attendance').doc();
    const testData = {
        memberId,
        branchId: 'gwangheungchang',
        classTitle: 'TEST_CLASS',
        instructor: 'TEST_INSTRUCTOR',
        date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
        timestamp: new Date().toISOString(),
        status: 'pending-offline',
        isTest: true
    };

    await pendingRef.set(testData);
    console.log(`\n✅ Created Pending Doc: ${pendingRef.id}`);
    console.log('⏳ Waiting 10 seconds for Cloud Function to trigger...');

    // 3. Wait and Check
    await new Promise(resolve => setTimeout(resolve, 30000));

    // 4. Verify
    const checkPending = await pendingRef.get();
    if (!checkPending.exists) {
        console.log('🎉 SUCCESS: Pending document was DELETED (Processed)!');
        
        // Optional: Check if attendance record created
        const attSnap = await db.collection('attendance')
            .where('memberId', '==', memberId)
            .where('className', '==', 'TEST_CLASS')
            .limit(1)
            .get();
        
        if (!attSnap.empty) {
            console.log('🎉 SUCCESS: Attendance record CREATED!');
            console.log(`   ID: ${attSnap.docs[0].id}`);
            
            // Cleanup attendance record
            await attSnap.docs[0].ref.delete();
            console.log('🧹 Cleaned up test attendance record.');

            // Revert member credit decrement (since process decrements it)
            await db.collection('members').doc(memberId).update({
                credits: admin.firestore.FieldValue.increment(1),
                attendanceCount: admin.firestore.FieldValue.increment(-1)
            });
            console.log('🧹 Reverted member stats.');
        } else {
            console.error('❌ FAILURE: Attendance record NOT found.');
        }

    } else {
        console.error('❌ FAILURE: Pending document still EXISTS (Function did not trigger).');
        // Cleanup pending
        await pendingRef.delete();
        console.log('🧹 Cleaned up pending record.');
    }
}

testOfflineSync();
