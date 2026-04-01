const admin = require('firebase-admin');
const acc = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(acc) });

async function check() {
    const db = admin.firestore();
    console.log("Fetching DB data...");
    const d = await db.doc('studios/ssangmun-yoga').get();
    console.log('SSANGMUN IDENTITY:', JSON.stringify(d.data().IDENTITY));
    
    const d2 = await db.collection('studios/demo-yoga/settings').doc('pricing').get();
    console.log('DEMO PRICING MENU KEYS:', Object.keys(d2.data()?.menus || {}));
    
    const d3 = await db.collection('studios/ssangmun-yoga/settings').doc('pricing').get();
    console.log('SSANGMUN PRICING EXISTS:', d3.exists);
    if(d3.exists) {
        console.log('SSANGMUN PRICING DATA KEYS:', Object.keys(d3.data()?.menus || {}));
    }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
