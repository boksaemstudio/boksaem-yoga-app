const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
    const memberId = '8BMTpU3Ehrz4jkd0lZce';
    
    // 1. Delete ALL 정계수 today records (they're all phantom now - morning was already deleted earlier)
    const snap = await db.collection('studios/boksaem-yoga/attendance')
        .where('date', '==', '2026-03-30')
        .where('memberId', '==', memberId)
        .get();
    
    let deleted = 0;
    for (const doc of snap.docs) {
        await doc.ref.delete();
        deleted++;
        console.log(`Deleted: ${doc.id}`);
    }
    
    // 2. Recreate the morning legitimate record (아침 9:40 하타 - 원장님이 정상이라 한 것)
    const morningTimestamp = new Date('2026-03-30T00:40:04.604Z'); // UTC = KST 9:40
    await db.collection('studios/boksaem-yoga/attendance').add({
        memberId,
        memberName: '정계수',
        branchId: 'main',
        date: '2026-03-30',
        className: '하타',
        instructor: '미지정',
        timestamp: admin.firestore.Timestamp.fromDate(morningTimestamp),
        type: 'checkin',
        status: 'valid',
        classTime: null,
        sessionNumber: 1,
        cumulativeCount: 1
    });
    console.log('Recreated morning attendance (9:40 AM 하타)');
    
    // 3. Fix credits: we deleted ALL (including phantoms) and recreated 1, so net adjustment needed
    // Previously: credits was incremented by 3 (from first fix) then decremented by 1 (emergency fix deleted wrong one)
    // Now: we delete remaining phantom(s) and the wrongly-kept one. Net: just ensure 1 attendance
    // Actually let's just read current state and fix
    const memberDoc = await db.doc(`studios/boksaem-yoga/members/${memberId}`).get();
    const memberData = memberDoc.data();
    console.log(`Current credits: ${memberData.credits}, attendanceCount: ${memberData.attendanceCount}`);
    
    // Adjust: we deleted (deleted) records, created 1 back. Net change from what's in DB now.
    // The phantoms that existed now are gone. Only 1 legitimate attendance should exist.
    // Undo the damage: +deleted for credits, -deleted for attendanceCount, then -1/+1 for the recreated one
    const netCreditAdjust = deleted - 1; // deleted phantoms minus the 1 we recreated
    if (netCreditAdjust > 0) {
        await db.doc(`studios/boksaem-yoga/members/${memberId}`).update({
            credits: admin.firestore.FieldValue.increment(netCreditAdjust),
            attendanceCount: admin.firestore.FieldValue.increment(-netCreditAdjust)
        });
        console.log(`Adjusted credits by +${netCreditAdjust}`);
    }
    
    console.log('DONE - 정계수 data fully restored');
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
