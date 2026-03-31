const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    console.log("Searching for restored attendance documents with Invalid Date format...");
    
    // 복구된 문서만 타겟팅
    const snap = await db.collection('studios').doc('boksaem-yoga').collection('attendance')
        .where('method', '==', 'system_restore').get();
        
    const batch = db.batch();
    let count = 0;
    
    snap.forEach(doc => {
        const data = doc.data();
        let tsStr = null;
        
        // Firestore Timestamp 객체인지 확인 (toDate 함수가 있음)
        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
            tsStr = data.timestamp.toDate().toISOString(); // ISO 포맷 문자열로 변환
        } 
        // 혹은 원시 객체 형태인 경우
        else if (data.timestamp && data.timestamp._seconds !== undefined) {
            tsStr = new Date(data.timestamp._seconds * 1000).toISOString();
        }
        
        if (tsStr && data.timestamp !== tsStr) {
            batch.update(doc.ref, { timestamp: tsStr });
            console.log(`Updated ${doc.id}: Timestamp Object -> '${tsStr}'`);
            count++;
        }
    });
    
    if (count > 0) {
        await batch.commit();
        console.log(`Successfully fixed ${count} restored attendance records (Invalid Date issue).`);
    } else {
        console.log("No records needed fixing.");
    }
    process.exit(0);
}

run().catch(console.error);
