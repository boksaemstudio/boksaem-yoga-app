import { db } from '../src/firebase.js';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';

async function fixCredits() {
    const targetNames = ['백현경', '고영애'];
    const membersRef = collection(db, 'members');

    for (const name of targetNames) {
        const q = query(membersRef, where('name', '==', name));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            const memberDoc = snap.docs[0];
            const currentCredits = memberDoc.data().credits;
            console.log(`[FIX] Member: ${name}, Current: ${currentCredits} -> New: ${currentCredits - 1}`);
            
            await updateDoc(doc(db, 'members', memberDoc.id), {
                credits: increment(-1)
            });
            console.log(`[FIX] Successfully deducted 1 credit for ${name}.`);
        } else {
            console.log(`[FIX] Member ${name} not found.`);
        }
    }
    process.exit();
}

fixCredits();
