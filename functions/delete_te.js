const { admin } = require('./helpers/common');
const db = admin.firestore();

async function removeBranchTE() {
    console.log('Removing branch TE...');
    const ref = db.collection('studios').doc('default');
    const snap = await ref.get();
    
    if(snap.exists) {
        const data = snap.data();
        if(data.BRANCHES) {
            const newBranches = data.BRANCHES.filter(b => b.id !== 'te');
            if(data.BRANCHES.length !== newBranches.length) {
                await ref.update({ BRANCHES: newBranches });
                console.log('Branch TE successfully removed!');
            } else {
                console.log('Branch TE not found in BRANCHES.');
            }
        }
    } else {
        console.log('Studio doc not found.');
    }
}

removeBranchTE().then(() => process.exit(0)).catch(console.error);
