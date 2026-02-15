
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCTjDayI1tiZO15eynRzKqrDK3TKj3D-yw",
    authDomain: "boksaem-yoga.firebaseapp.com",
    projectId: "boksaem-yoga",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkMemberError() {
    console.log('Searching for member "이수연"...');
    
    // 1. Find Member
    const membersRef = collection(db, 'members');
    const q = query(membersRef, where('name', '==', '이수연'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        console.log('Member "이수연" not found.');
        return;
    }

    let memberId;
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`Found Member: ${data.name} (ID: ${doc.id})`);
        console.log(`- Phone: ${data.phone}`);
        console.log(`- Credits: ${data.credits}`);
        console.log(`- Status: ${data.status}`);
        console.log(`- EndDate: ${data.endDate}`);
        memberId = doc.id;
    });

    if (!memberId) return;

    // 2. Check Recent Error Logs
    console.log('\nChecking recent error logs...');
    const errorsRef = collection(db, 'error_logs');
    // We might not have a direct link to memberId in error logs, but we can search by message or time
    // Let's just get the last 20 logs
    const errorQ = query(errorsRef, orderBy('timestamp', 'desc'), limit(20));
    const errorSnapshot = await getDocs(errorQ);

    if (errorSnapshot.empty) {
        console.log('No recent error logs found.');
    } else {
        errorSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`[${data.timestamp}] ${data.error} (Context: ${JSON.stringify(data.context || {})})`);
        });
    }

    // 3. Check Attendance Logs for this member
    console.log(`\nChecking attendance logs for member ${memberId}...`);
    const logsRef = collection(db, 'attendance_logs');
    const logsQ = query(logsRef, where('memberId', '==', memberId), orderBy('timestamp', 'desc'), limit(5));
    const logsSnapshot = await getDocs(logsQ);

    if (logsSnapshot.empty) {
        console.log('No attendance logs found for this member.');
    } else {
        logsSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`[${data.timestamp}] Status: ${data.status}, Class: ${data.className}`);
        });
    }
}

checkMemberError();
