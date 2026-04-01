import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, getDoc, updateDoc, addDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAGoYm-y-nStH33UaRR8KIy2MRP_fQt_g0",
    authDomain: "studio-4401180292-32f52.firebaseapp.com",
    projectId: "studio-4401180292-32f52",
    storageBucket: "studio-4401180292-32f52.firebasestorage.app",
    messagingSenderId: "919620283844",
    appId: "1:919620283844:web:fd338767c8866cb2f84891"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDuplicatesAndFix() {
    try {
        console.log("Checking for 5876...");
        const q = query(collection(db, 'members'), where("phoneLast4", "==", "5876"));
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Found ${results.length} members.`);

        if (results.length === 0) return;

        // Try to update the first one (ID 10529 likely)
        const targetMember = results[0];
        console.log(`Attempting to update member: ${targetMember.name} (ID: ${targetMember.id})`);

        const memberRef = doc(db, 'members', targetMember.id);
        const updateData = {
            lastAttended: new Date().toISOString().split('T')[0]
        };

        await updateDoc(memberRef, updateData);
        console.log(`Successfully updated ${targetMember.id}`);

        // Try adding attendance log
        console.log("Attempting to add attendance log...");
        const newLog = {
            memberId: targetMember.id,
            memberName: targetMember.name,
            branchId: 'gwangheungchang',
            className: '테스트수업',
            timestamp: new Date().toISOString()
        };

        const logRef = await addDoc(collection(db, 'attendance'), newLog);
        console.log("Successfully added attendance log. ID:", logRef.id);

    } catch (e) {
        console.error("ERROR OCCURRED:");
        console.error(e);
    }
    process.exit(0);
}

checkDuplicatesAndFix();
