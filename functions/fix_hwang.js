const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixHwang() {
    const today = '2026-02-15';
    const name = '황화정';
    console.log(`--- Fixing attendance for ${name} on ${today} ---`);

    const lSnap = await db.collection('attendance')
        .where('date', '==', today)
        .where('memberName', '==', name)
        .get();
    
    if (lSnap.empty) {
        console.log(`No attendance log found for ${name} today.`);
        return;
    }

    for (const doc of lSnap.docs) {
        const data = doc.data();
        console.log(`Fixing log ${doc.id}: Current Class=${data.className}, Status=${data.status}, Reason=${data.denialReason}`);
        
        // Update to Mysore even if denied
        await doc.ref.update({
            className: '마이솔',
            instructor: '원장',
            branchId: 'gwangheungchang'
        });
        console.log(`Successfully updated ${name}'s log to Mysore.`);
    }
}

fixHwang().then(() => console.log('\nSUCCESS')).catch(e => console.error(e));
