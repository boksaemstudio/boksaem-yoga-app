import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

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

async function checkAttendanceData() {
    console.log('=== Checking Attendance Data ===\n');

    try {
        // 1. Find member 송대민
        console.log('1. Finding member 송대민...');
        const membersQuery = query(collection(db, 'members'), where('name', '==', '송대민'));
        const membersSnap = await getDocs(membersQuery);

        if (membersSnap.empty) {
            console.log('❌ No member found with name 송대민');
            return;
        }

        const memberDoc = membersSnap.docs[0];
        const memberData = memberDoc.data();
        const memberId = memberDoc.id;

        console.log('✅ Found member:');
        console.log('   ID:', memberId);
        console.log('   Name:', memberData.name);
        console.log('   Phone:', memberData.phone);
        console.log('   Credits:', memberData.credits);
        console.log('   EndDate:', memberData.endDate);
        console.log('');

        // 2. Query attendance by memberId
        console.log('2. Querying attendance by memberId...');
        const attendanceQuery = query(
            collection(db, 'attendance'),
            where('memberId', '==', memberId),
            orderBy('timestamp', 'desc'),
            limit(10)
        );

        try {
            const attendanceSnap = await getDocs(attendanceQuery);
            console.log(`✅ Found ${attendanceSnap.size} attendance records by memberId`);

            if (attendanceSnap.size > 0) {
                console.log('   Sample records:');
                attendanceSnap.docs.slice(0, 3).forEach((doc, idx) => {
                    const data = doc.data();
                    console.log(`   [${idx + 1}] ID: ${doc.id}`);
                    console.log(`       memberId: ${data.memberId}`);
                    console.log(`       memberName: ${data.memberName}`);
                    console.log(`       timestamp: ${data.timestamp}`);
                    console.log(`       className: ${data.className}`);
                    console.log(`       branchId: ${data.branchId}`);
                    console.log('');
                });
            }
        } catch (error) {
            console.log('❌ Error querying by memberId:', error.message);
            console.log('   Error code:', error.code);
        }

        // 3. Query attendance by memberName (alternative)
        console.log('3. Querying attendance by memberName...');
        const attendanceByNameQuery = query(
            collection(db, 'attendance'),
            where('memberName', '==', '송대민'),
            orderBy('timestamp', 'desc'),
            limit(10)
        );

        try {
            const attendanceByNameSnap = await getDocs(attendanceByNameQuery);
            console.log(`✅ Found ${attendanceByNameSnap.size} attendance records by memberName`);

            if (attendanceByNameSnap.size > 0) {
                console.log('   Sample records:');
                attendanceByNameSnap.docs.slice(0, 3).forEach((doc, idx) => {
                    const data = doc.data();
                    console.log(`   [${idx + 1}] ID: ${doc.id}`);
                    console.log(`       memberId: ${data.memberId}`);
                    console.log(`       memberName: ${data.memberName}`);
                    console.log(`       timestamp: ${data.timestamp}`);
                    console.log(`       className: ${data.className}`);
                    console.log('');
                });
            }
        } catch (error) {
            console.log('❌ Error querying by memberName:', error.message);
        }

        // 4. Get all attendance records (first 5) to see structure
        console.log('4. Getting sample attendance records...');
        const allAttendanceQuery = query(
            collection(db, 'attendance'),
            orderBy('timestamp', 'desc'),
            limit(5)
        );

        const allAttendanceSnap = await getDocs(allAttendanceQuery);
        console.log(`✅ Sample of ${allAttendanceSnap.size} recent attendance records:`);
        allAttendanceSnap.docs.forEach((doc, idx) => {
            const data = doc.data();
            console.log(`   [${idx + 1}] ${data.memberName || 'N/A'} - ${data.timestamp}`);
            console.log(`       Fields: ${Object.keys(data).join(', ')}`);
        });

    } catch (error) {
        console.error('❌ Fatal error:', error);
    }
}

checkAttendanceData().then(() => {
    console.log('\n=== Check Complete ===');
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
