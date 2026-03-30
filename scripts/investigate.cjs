const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    try {
        console.log("Fetching attendance records for 정계수...");
        const snap = await db.collection('studios/boksaem-yoga/attendance')
            .where('date', '==', '2026-03-30')
            .where('memberName', '==', '정계수')
            .get();
        if (snap.empty) {
            console.log("No attendance found today.");
        } else {
            console.log(`Found ${snap.size} records:`);
            const docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
            docs.sort((a,b) => {
                const ta = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
                const tb = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
                return ta - tb;
            });
            docs.forEach(doc => {
                let ts = 'N/A';
                if (doc.timestamp) {
                    ts = doc.timestamp.toDate ? doc.timestamp.toDate().toLocaleString('ko-KR', {timeZone:'Asia/Seoul'}) : new Date(doc.timestamp).toLocaleString('ko-KR', {timeZone:'Asia/Seoul'});
                }
                console.log(`- ${ts} | Status: ${doc.status} | Method: ${doc.method || 'unknown'} | Class: ${doc.className} | Device: ${doc.device || 'unknown'}`);
            });
        }
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}
run();
