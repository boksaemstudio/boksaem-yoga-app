const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    const s = await db.collection('studios').doc('boksaem-yoga').collection('attendance')
        .where('date', '==', '2026-03-23')
        .where('branchId', '==', 'mapo')
        .get();
        
    const classes = new Set();
    s.docs.forEach(d => {
        const dt = d.data();
        if (dt.classTime >= '20:00') {
            classes.add(`${dt.classTime} ${dt.className} | ${dt.instructor}`);
        }
    });
    console.log('3/23 Mapo Evening Classes:', Array.from(classes));
    
    const s2 = await db.collection('studios').doc('boksaem-yoga').collection('attendance')
        .where('date', '==', '2026-03-16')
        .where('branchId', '==', 'mapo')
        .get();
        
    const classes2 = new Set();
    s2.docs.forEach(d => {
        const dt = d.data();
        if (dt.classTime >= '20:00') {
            classes2.add(`${dt.classTime} ${dt.className} | ${dt.instructor}`);
        }
    });
    console.log('3/16 Mapo Evening Classes:', Array.from(classes2));
    
    process.exit(0);
}
run();
