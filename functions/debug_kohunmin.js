const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function debug() {
    console.log('--- FETCHING 고훈민 DATA ---');
    const memberSnap = await db.collection('members').where('name', '==', '고훈민').get();
    
    if (memberSnap.empty) {
        console.log('Member 고훈민 not found!');
        return;
    }

    memberSnap.forEach(doc => {
        console.log('ID:', doc.id);
        console.log('DATA:', JSON.stringify(doc.data(), null, 2));
    });

    console.log('\n--- FETCHING RECENT ATTENDANCE ---');
    const attSnap = await db.collection('attendance')
        .where('memberName', '==', '고훈민')
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();
    
    attSnap.forEach(doc => {
        const data = doc.data();
        console.log(`Date: ${data.date} | Status: ${data.status} | Class: ${data.className} | TS: ${data.timestamp}`);
    });

    console.log('\n--- SERVER TIME CHECK ---');
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    console.log('Server Today (KST):', today);
}

debug().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
