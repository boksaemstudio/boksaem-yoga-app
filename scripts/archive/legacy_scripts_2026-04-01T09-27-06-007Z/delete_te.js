import { db } from '../src/firebase.js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

async function removeBranchTE() {
    console.log('Removing branch TE...');
    const ref = doc(db, 'studios', 'default');
    const snap = await getDoc(ref);
    
    if(snap.exists()) {
        const data = snap.data();
        if(data.BRANCHES) {
            const newBranches = data.BRANCHES.filter(b => b.id !== 'te');
            if(data.BRANCHES.length !== newBranches.length) {
                await updateDoc(ref, { BRANCHES: newBranches });
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
