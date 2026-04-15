const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function fixTimestamps() {
    const tenantDb = db.collection('studios').doc('boksaem-yoga');
    
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const startOfDay = new Date(`${today}T00:00:00+09:00`);
    const endOfDay = new Date(`${today}T23:59:59+09:00`);
    
    // Remaining 3 members
    const snap = await tenantDb.collection('attendance')
        .where('memberName', 'in', ['차신애', '나혜실ttc6기', '백현경'])
        .get();
        
    const batch = db.batch();
    let count = 0;
    
    snap.forEach(d => {
        const data = d.data();
        if (data.className !== '마이솔') return;

        let shouldFix = false;
        const updates = {};
        
        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
            updates.timestamp = data.timestamp.toDate().toISOString();
            shouldFix = true;
        }

        if (data.date === undefined || data.date !== today) {
            updates.date = today;
            shouldFix = true;
        }

        if (data.classTime === undefined || data.classTime !== '13:30') {
            updates.classTime = '13:30';
            shouldFix = true;
        }
        
        if (data.instructor !== '희정') {
            updates.instructor = '희정';
            shouldFix = true;
        }

        if (shouldFix && data.note && data.note.includes('수동 등록')) {
            console.log(`Fixing doc ${d.id} for ${data.memberName}`);
            batch.update(d.ref, updates);
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`Successfully fixed ${count} documents.`);
    } else {
        console.log("No documents needed fixing.");
    }
}

fixTimestamps().catch(console.error).finally(()=>process.exit(0));
