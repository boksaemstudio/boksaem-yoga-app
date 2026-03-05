const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');
const { getFirestore, collection, getDocs, query, where, orderBy, limit } = require('firebase/firestore');

// Initialize Firebase (replace with valid config if needed, or rely on ambient env if running in context)
// Assuming running in environment where firebase is initialized or passed
// For standalone script, we need config. 
// I'll assume we can use the 'functions/scripts/check_attendance.js' style.

const firebaseConfig = {
    apiKey: "AIzaSyCTjDayI1tiZO15eynRzKqrDK3TKj3D-yw",
    authDomain: "boksaem-yoga.firebaseapp.com",
    projectId: "boksaem-yoga",
    storageBucket: "boksaem-yoga.firebasestorage.app",
    messagingSenderId: "638854766032",
    appId: "1:638854766032:web:db6b919068aaf5808b2dd5"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, 'asia-northeast3');
const db = getFirestore(app);

async function runTest() {
    console.log("=== Testing Multiple Check-in ===");
    const checkIn = httpsCallable(functions, 'checkInMemberV2Call');

    // 1. Find a test member (or specific member '복샘요가 다회')
    // Let's search for '복샘요가' first
    const membersRef = collection(db, 'members');
    // Using a broad search or specific ID if known.
    // Let's try to find ANY member to test with, or ideally create a temp one?
    // Creating temp is safer.
    
    // Actually, let's use '송대민' as seen in other scripts, or look for '테스트'.
    // Or just query for name '복샘요가'.
    const q = query(membersRef, where('name', '>=', '복샘요가'), where('name', '<=', '복샘요가\uf8ff'));
    const snap = await getDocs(q);
    
    let memberId;
    if (snap.empty) {
        console.log("Member '복샘요가' not found. Using a test member '테스트회원'.");
         // fallback search
        const q2 = query(membersRef, where('name', '==', '테스트회원'));
        const snap2 = await getDocs(q2);
        if (snap2.empty) {
             console.log("No test member found. Aborting.");
             return;
        }
        memberId = snap2.docs[0].id;
    } else {
        const member = snap.docs[0];
        memberId = member.id;
        console.log(`Found member: ${member.data().name} (${memberId})`);
    }

    const branchId = 'gwangheungchang'; // Default branch

    // 2. First Check-in
    console.log("\n--- Attempting 1st Check-in ---");
    try {
        const res1 = await checkIn({ 
            memberId, 
            branchId, 
            classTitle: '테스트 수업 1', 
            instructor: '테스트 강사' 
        });
        console.log("Result 1:", res1.data);
    } catch (e) {
        console.error("Check-in 1 failed:", e.message);
    }

    // 3. Second Check-in (Immediately - should be blocked as duplicate unless forced)
    console.log("\n--- Attempting 2nd Check-in (Immediate) ---");
    try {
        const res2 = await checkIn({ 
            memberId, 
            branchId, 
            classTitle: '테스트 수업 2', 
            instructor: '테스트 강사'
        });
        console.log("Result 2 (Should be duplicate):", res2.data);
    } catch (e) {
        console.error("Check-in 2 failed:", e.message);
    }

    // 4. Third Check-in (Forced - should succeed as session 2)
    console.log("\n--- Attempting 3rd Check-in (Forced) ---");
    try {
        const res3 = await checkIn({ 
            memberId, 
            branchId, 
            classTitle: '테스트 수업 2', 
            instructor: '테스트 강사',
            force: true 
        });
        console.log("Result 3 (Should be new session):", res3.data);
    } catch (e) {
        console.error("Check-in 3 failed:", e.message);
    }
}

runTest();
