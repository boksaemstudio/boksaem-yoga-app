const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '..', 'service-account-key.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function normalizeMorningAttendance() {
    console.log('=== Normalize: Attendance after 09:00 AM KST ===');
    const startTime = '2026-02-16T00:00:00.000Z'; 

    // 1. Fetch Attendance
    const attSnap = await db.collection('attendance')
        .where('timestamp', '>=', startTime)
        .orderBy('timestamp', 'asc')
        .get();

    const attendanceMap = {}; // memberId -> [docs]
    const duplicates = [];

    attSnap.docs.forEach(doc => {
        const data = doc.data();
        if (!attendanceMap[data.memberId]) {
            attendanceMap[data.memberId] = [];
        }
        attendanceMap[data.memberId].push({ id: doc.id, ...data, ref: doc.ref });
    });

    // 2. Fix Duplicates in Attendance
    console.log('\n[1] Checking for Duplicates in Attendance...');
    for (const [memberId, docs] of Object.entries(attendanceMap)) {
        if (docs.length > 1) {
            console.log(` ⚠️ Member [${docs[0].memberName}] (${memberId}) has ${docs.length} records.`);
            // Keep the earliest one, delete others
            // OR keep the one with 'valid' status? They are probably all valid.
            // Let's keep the FIRST one (earliest timestamp) and refund credits for duplicates.
            
            const [first, ...rest] = docs;
            console.log(`    Keep: ${first.timestamp} (${first.id})`);
            
            for (const dup of rest) {
                console.log(`    DELETE: ${dup.timestamp} (${dup.id}) - Refunding credit...`);
                
                await db.runTransaction(async (t) => {
                    const memberRef = db.collection('members').doc(memberId);
                    t.delete(dup.ref);
                    t.update(memberRef, {
                        credits: admin.firestore.FieldValue.increment(1),
                        attendanceCount: admin.firestore.FieldValue.increment(-1)
                    });
                });
                console.log(`    ✅ Deleted & Refunded`);
            }
        }
    }

    // 3. Process Pending Records
    console.log('\n[2] Processing Stuck Pending Records...');
    const pendingSnap = await db.collection('pending_attendance')
        .where('timestamp', '>=', startTime)
        .get();

    for (const doc of pendingSnap.docs) {
        const data = doc.data();
        const memberId = data.memberId;

        // Check if this member ALREADY has an attendance record today
        // We re-check the map (note: we just deleted duplicates, so map still has the 'first' one)
        if (attendanceMap[memberId] && attendanceMap[memberId].length > 0) {
            console.log(` ⚠️ Pending doc for [${memberId}] already has attendance. Deleting pending doc.`);
            await doc.ref.delete();
            console.log(`    ✅ Deleted pending doc (Duplicate of established attendance)`);
        } else {
            console.log(` 🚀 Syncing genuine pending record for [${memberId}]...`);
             try {
                await db.runTransaction(async (transaction) => {
                    const memberRef = db.collection('members').doc(memberId);
                    const memberSnap = await transaction.get(memberRef);

                    if (!memberSnap.exists) {
                        console.error(`❌ Member not found: ${memberId}`);
                        await transaction.delete(doc.ref); // Delete orphan
                        return;
                    }

                    const memberData = memberSnap.data();
                    const currentCredits = memberData.credits || 0;
                    const currentCount = memberData.attendanceCount || 0;

                    const attendanceData = {
                        memberId,
                        memberName: memberData.name,
                        branchId: data.branchId,
                        date: data.date,
                        className: data.classTitle || '자율수련',
                        instructor: data.instructor || '미지정',
                        timestamp: data.timestamp,
                        status: 'valid',
                        credits: currentCredits - 1,
                        cumulativeCount: currentCount + 1,
                        syncMode: 'manual-cleanup-script'
                    };

                    const attRef = db.collection('attendance').doc();
                    transaction.set(attRef, attendanceData);

                    transaction.update(memberRef, {
                        credits: admin.firestore.FieldValue.increment(-1),
                        attendanceCount: admin.firestore.FieldValue.increment(1),
                        lastAttendance: data.timestamp
                    });

                    transaction.delete(doc.ref);
                });
                console.log(`    ✅ Synced`);
            } catch (e) {
                console.error(`    ❌ Failed to sync:`, e);
            }
        }
    }
}

normalizeMorningAttendance();
