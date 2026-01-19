import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, count } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCTjDayI1tiZO15eynRzKqrDK3TKj3D-yw",
    authDomain: "boksaem-yoga.firebaseapp.com",
    projectId: "boksaem-yoga",
    storageBucket: "boksaem-yoga.firebasestorage.app",
    messagingSenderId: "638854766032",
    appId: "1:638854766032:web:db6b919068aaf5808b2dd5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runAudit() {
    console.log("=== SYSTEM AUDIT START ===\n");

    // 1. Members Count
    const membersSnap = await getDocs(collection(db, "members"));
    console.log(`Total Members: ${membersSnap.size}`);

    // 2. Admin Check (Search for role: 'admin' or name containing admin)
    // Looking at the codebase, there isn't a strict 'role' field often but let's see.
    let admins = [];
    membersSnap.forEach(doc => {
        const data = doc.data();
        if (data.role === 'admin' || data.name.includes('관리자') || data.isAdmin === true) {
            admins.push({ id: doc.id, name: data.name });
        }
    });

    console.log(`Admins Found: ${admins.length}`);
    admins.forEach(a => console.log(` - ${a.name} (${a.id})`));

    // 3. FCM Tokens
    const tokensSnap = await getDocs(collection(db, "fcm_tokens"));
    console.log(`\nTotal FCM Tokens: ${tokensSnap.size}`);

    // Check if admins have tokens
    for (const admin of admins) {
        const adminTokens = tokensSnap.docs.filter(d => d.data().memberId === admin.id);
        console.log(`Admin ${admin.name} Tokens: ${adminTokens.length} (Push ${adminTokens.length > 0 ? 'ON' : 'OFF'})`);
    }

    // 4. Today's Attendance Summary
    const todayStr = new Date().toISOString().split('T')[0];
    const attendanceSnap = await getDocs(collection(db, "attendance"));
    let todayCount = 0;
    attendanceSnap.forEach(doc => {
        if (doc.data().timestamp.startsWith(todayStr)) todayCount++;
    });
    console.log(`\nToday's Attendance: ${todayCount}`);

    console.log("\n=== SYSTEM AUDIT END ===");
}

runAudit().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
