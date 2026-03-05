const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function revertBranch() {
    const name = '이수연';
    console.log(`--- Reverting ${name}'s profile branch to 'mapo' ---`);
    
    const mSnap = await db.collection('members').where('name', '==', name).get();
    if (mSnap.empty) {
        console.log(`Member ${name} not found`);
        return;
    }
    
    const mDoc = mSnap.docs[0];
    const currentBranch = mDoc.data().branchId;
    console.log(`Current branch: ${currentBranch}`);
    
    if (currentBranch === 'gwangheungchang') {
        await mDoc.ref.update({ branchId: 'mapo' });
        console.log(`Successfully reverted ${name}'s profile branch to 'mapo'`);
    } else {
        console.log(`Branch is already ${currentBranch}, no need to revert.`);
    }
}

revertBranch().then(() => console.log('\nSUCCESS')).catch(e => console.error(e));
