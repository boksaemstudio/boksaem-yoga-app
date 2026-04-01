import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

async function checkTodayAttendance() {
    const todayStr = new Date().toISOString().split('T')[0];
    console.log(`Checking attendance for: ${todayStr}\n`);

    // Attendance timestamps follow ISO format "YYYY-MM-DDTHH:mm:ss.sssZ"
    // So we query for anything starting with todayStr
    const q = query(collection(db, "attendance"));
    const snapshot = await getDocs(q);

    console.log(`Found total ${snapshot.size} attendance logs.\n`);

    let todayCount = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.timestamp.startsWith(todayStr)) {
            todayCount++;
            console.log(`ID: ${doc.id}`);
            console.log(`Member: ${data.memberName} (${data.memberId})`);
            console.log(`Branch: ${data.branchId}`);
            console.log(`Class: ${data.className}`);
            console.log(`Time: ${data.timestamp}`);
            console.log('---');
        }
    });

    console.log(`Total logs for today (${todayStr}): ${todayCount}`);
}

checkTodayAttendance().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
