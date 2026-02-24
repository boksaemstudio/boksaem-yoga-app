const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function debug() {
    console.log('--- FETCHING 고훈민 ---');
    const khm = await db.collection('members').where('name', '==', '고훈민').get();
    khm.forEach(d => console.log(JSON.stringify({id: d.id, ...d.data()}, null, 2)));

    console.log('\n--- FETCHING 장민정 ---');
    const jmj = await db.collection('members').where('name', '==', '장민정').get();
    jmj.forEach(d => console.log(JSON.stringify({id: d.id, ...d.data()}, null, 2)));

    console.log('\n--- SYSTEM TIME ---');
    const now = new Date();
    const kst = now.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' });
    console.log('KST Now:', kst);
}

debug().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
