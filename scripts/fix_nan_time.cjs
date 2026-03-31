const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    console.log("Searching for restored attendance documents...");
    
    const snap = await db.collection('studios').doc('boksaem-yoga').collection('attendance')
        .where('method', '==', 'system_restore').get();
        
    const batch = db.batch();
    let count = 0;
    
    snap.forEach(doc => {
        const data = doc.data();
        if (data.className && /\d{2}:\d{2}/.test(data.className.split(' ')[0])) {
            const parts = data.className.split(' ');
            const time = parts[0]; // e.g., '21:00'
            const title = parts.slice(1).join(' '); // e.g., '플라잉 (기초)'
            
            batch.update(doc.ref, {
                classTime: time,     // Fixes the NaN:NaN issue
                className: title     // Cleans up the Name
            });
            console.log(`Updated ${doc.id}: classTime='${time}', className='${title}'`);
            count++;
        }
    });
    
    if (count > 0) {
        await batch.commit();
        console.log(`Successfully fixed ${count} restored attendance records.`);
    } else {
        console.log("No records needed fixing.");
    }
    process.exit(0);
}

run().catch(console.error);
