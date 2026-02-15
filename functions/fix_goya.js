const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixGoYoungAe() {
    const today = '2026-02-15';
    const name = '고영애';
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
        console.log(`Fixing log ${doc.id}: ${doc.data().className} -> 마이솔 (원장)`);
        await doc.ref.update({
            className: '마이솔',
            instructor: '원장',
            branchId: 'gwangheungchang'
        });
    }
}

fixGoYoungAe().then(() => console.log('\nSUCCESS')).catch(e => console.error(e));
