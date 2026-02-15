const admin = require('firebase-admin');

// Simple initialization for local execution
if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'boksaem-yoga'
    });
}

const db = admin.firestore();

async function run() {
    const today = '2026-02-15';
    console.log(`--- Checking daily_classes for ${today} ---`);
    
    const ghcSnap = await db.collection('daily_classes').doc(`gwangheungchang_${today}`).get();
    if (ghcSnap.exists) {
        console.log('GHC Classes found:', ghcSnap.data().classes.map(c => `${c.time} ${c.title} (${c.instructor})`));
    } else {
        console.log('GHC Classes NOT FOUND');
    }

    const mapoSnap = await db.collection('daily_classes').doc(`mapo_${today}`).get();
    if (mapoSnap.exists) {
        console.log('Mapo Classes found:', mapoSnap.data().classes.map(c => `${c.time} ${c.title} (${c.instructor})`));
    } else {
        console.log('Mapo Classes NOT FOUND');
    }

    const members = ['박미진', '이수연'];
    for (const name of members) {
        console.log(`\n--- Fixing ${name} ---`);
        const mSnap = await db.collection('members').where('name', '==', name).get();
        if (mSnap.empty) {
            console.log(`Member ${name} not found`);
            continue;
        }
        const mDoc = mSnap.docs[0];
        console.log(`${name} current branch: ${mDoc.data().branchId}`);
        
        // Fix profile branch to GHC
        if (mDoc.data().branchId !== 'gwangheungchang') {
            await mDoc.ref.update({ branchId: 'gwangheungchang' });
            console.log(`Updated ${name} profile branch to GHC`);
        }

        // Fix today's log
        const lSnap = await db.collection('attendance')
            .where('date', '==', today)
            .where('memberName', '==', name)
            .get();
        
        for (const doc of lSnap.docs) {
            console.log(`Fixing log ${doc.id}: ${doc.data().className} -> 마이솔`);
            await doc.ref.update({
                className: '마이솔',
                instructor: '원장',
                branchId: 'gwangheungchang'
            });
        }
    }
}

run().then(() => console.log('\nSUCCESS')).catch(e => console.error(e));
