const admin = require('firebase-admin');
const sa = require('./service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    // 1. Get all sales for 장민정
    const salesSnap = await db.collection('sales').where('memberId', '==', 'IFxQ1R74PwZpHHa3rAn3').get();
    console.log('=== SALES RECORDS ===');
    salesSnap.forEach(d => {
        const x = d.data();
        console.log(`ID: ${d.id} | Date: ${x.date} | Item: ${x.item} | Amount: ${x.amount} | Start: ${x.startDate || 'N/A'} | End: ${x.endDate || 'N/A'} | Type: ${x.type || 'N/A'}`);
    });

    // 2. Get recent attendance to determine actual usage
    const attSnap = await db.collection('attendance')
        .where('memberId', '==', 'IFxQ1R74PwZpHHa3rAn3')
        .orderBy('date', 'desc')
        .limit(20)
        .get();
    console.log('\n=== RECENT ATTENDANCE ===');
    attSnap.forEach(d => {
        const x = d.data();
        console.log(`Date: ${x.date} | Class: ${x.className} | Status: ${x.status}`);
    });

    // 3. Current member state
    const memberSnap = await db.collection('members').doc('IFxQ1R74PwZpHHa3rAn3').get();
    console.log('\n=== CURRENT MEMBER DATA ===');
    console.log(JSON.stringify(memberSnap.data(), null, 2));

    process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
