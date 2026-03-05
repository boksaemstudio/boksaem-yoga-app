const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
}

const db = admin.firestore();

async function checkTodayAttendance() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    console.log(`Checking attendance for: ${today}`);

    try {
        const snapshot = await db.collection('attendance')
            .where('date', '==', today)
            .get();

        if (snapshot.empty) {
            console.log('No attendance records found for today.');
            return;
        }

        console.log(`Found ${snapshot.size} records.`);
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`- [${data.instructor}] Member: ${data.memberName}, Class: ${data.className} (${data.timestamp})`);
        });

    } catch (error) {
        console.error('Error fetching attendance:', error);
    }
}

checkTodayAttendance();
