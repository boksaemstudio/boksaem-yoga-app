const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    const serviceAccount = require('./service-account-key.json');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function main() {
    console.log("Checking fcm_tokens for instructor: 원장");
    const tokensSnap = await db.collection('fcm_tokens')
        .where('role', '==', 'instructor')
        .where('instructorName', '==', '원장')
        .get();
        
    if (tokensSnap.empty) {
        console.log("No tokens found for instructor: 원장");
    } else {
        tokensSnap.forEach(doc => {
            console.log(`Token: ${doc.id} => ${JSON.stringify(doc.data())}`);
        });
    }
    
    console.log("\nChecking today's attendance around 14:00 (KST)");
    const today = '2026-02-23';
    const attSnap = await db.collection('attendance')
        .where('date', '==', today)
        .where('instructor', '==', '원장')
        .get();
        
    if (attSnap.empty) {
        console.log("No attendance records found for 원장 today.");
    } else {
        let count = 0;
        attSnap.forEach(doc => {
            const data = doc.data();
            const hour = new Date(data.timestamp).getHours(); 
            if (hour >= 13 && hour <= 15) {
                console.log(`Att Record: ${doc.id} => member: ${data.memberName}, class: ${data.className}, time: ${data.classTime}, timestamp: ${data.timestamp}, instructor: ${data.instructor}, status: ${data.status}`);
                count++;
            }
        });
        console.log(`Found ${count} records around 14:00.`);
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
