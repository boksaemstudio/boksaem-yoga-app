/**
 * 광흥창 daily_classes raw data 확인
 */
const admin = require('firebase-admin');
if (admin.apps.length === 0) {
    const serviceAccount = require('../service-account-key.json');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function check() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const docSnap = await db.collection('daily_classes').doc(`gwangheungchang_${today}`).get();
    
    if (docSnap.exists) {
        const data = docSnap.data();
        console.log('Raw document:');
        console.log(JSON.stringify(data, null, 2));
    }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
