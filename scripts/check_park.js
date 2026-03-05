import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

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
const auth = getAuth(app);

async function checkPark() {
    try {
        await signInAnonymously(auth);
        console.log("Logged in anonymously.");
        const membersQ = query(collection(db, "members"), where("name", "==", "박영주"));
        const membersSnap = await getDocs(membersQ);
        
        if (membersSnap.empty) {
            console.log("Member not found: 박영주");
            return;
        }

        const ids = [];
        membersSnap.forEach(doc => {
            ids.push(doc.id);
            console.log(`Found member ID: ${doc.id}`);
        });

        for (const uid of ids) {
            console.log(`\n--- Fetching attendance for ${uid} ---`);
            const attQ = query(collection(db, "attendance"), where("memberId", "==", uid));
            const attSnap = await getDocs(attQ);
            
            const docs = [];
            attSnap.forEach(d => docs.push({ id: d.id, ...d.data() }));

            // 3월 4일 기록 찾기
            const yesterdayDocs = docs.filter(d => {
                const tsStr = d.timestamp || d.date || '';
                return tsStr.startsWith('2026-03-04');
            });

            console.log(`March 4th logs: ${yesterdayDocs.length} count(s)`);
            yesterdayDocs.forEach(d => {
                console.log(`- ID: ${d.id}, Time: ${d.timestamp || d.date}, Title: ${d.title || d.className}, Reason: ${d.logicReason || 'none'}`);
            });
            
            // 최근 기록 5개 찾기
            console.log(`\n[Recent 5 Logs]`);
            docs.sort((a,b) => (b.timestamp || b.date).localeCompare(a.timestamp || a.date));
            docs.slice(0, 5).forEach(d => {
                console.log(`- ID: ${d.id}, Time: ${d.timestamp || d.date}, Title: ${d.title || d.className}, Reason: ${d.logicReason || 'none'}`);
            });
        }
    } catch (e) {
        console.error(e);
    }
}

checkPark().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
