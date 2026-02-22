const admin = require('firebase-admin');
const serviceAccount = require('./functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    try {
        console.log('--- Recent Attendance Records (Instructor names) ---');
        const attSnap = await db.collection('attendance').orderBy('timestamp', 'desc').limit(15).get();
        attSnap.forEach(d => {
            const att = d.data();
            console.log(`Class: ${att.className} | Instructor: ${att.instructor} | Member: ${att.memberName}`);
        });

        console.log('\n--- Checking member settings again ---');
        // Let's check specifically for "원장" and "한아"
        const membersRef = db.collection('members');
        const wonjangQuery = await membersRef.where('name', '==', '원장').get();
        const hanaQuery = await membersRef.where('name', '==', '한아').get();

        wonjangQuery.forEach(d => console.log('원장 member doc:', d.id, d.data().role, d.data().pushEnabled));
        hanaQuery.forEach(d => console.log('한아 member doc:', d.id, d.data().role, d.data().pushEnabled));

    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

run();
