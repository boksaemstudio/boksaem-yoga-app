const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    console.log("Searching for ALL attendance documents on March 30th with Invalid Date format...");
    
    // 3월 30일 전체 출석 기록을 대상으로 함 (복구 여부 무관)
    const snap = await db.collection('studios').doc('boksaem-yoga').collection('attendance')
        .where('date', '==', '2026-03-30').get();
        
    const batch = db.batch();
    let count = 0;
    
    snap.forEach(doc => {
        const data = doc.data();
        let tsStr = null;
        
        // 시간 데이터를 ISO 문자열로 통일
        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
            tsStr = data.timestamp.toDate().toISOString();
        } else if (data.timestamp && data.timestamp._seconds !== undefined) {
             tsStr = new Date(data.timestamp._seconds * 1000).toISOString();
        }
        
        if (tsStr && data.timestamp !== tsStr) {
            batch.update(doc.ref, { timestamp: tsStr });
            console.log(`Updated ${data.memberName || 'Unknown'}'s log (${doc.id}): Timestamp -> '${tsStr}'`);
            count++;
        }
    });
    
    if (count > 0) {
        await batch.commit();
        console.log(`Successfully fixed ${count} attendance records (Invalid Date issue).`);
    } else {
        console.log("No records needed fixing.");
    }
    process.exit(0);
}

run().catch(console.error);
