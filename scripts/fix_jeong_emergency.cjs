const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
    const snap = await db.collection('studios/boksaem-yoga/attendance')
        .where('date', '==', '2026-03-30')
        .where('memberName', '==', '정계수')
        .get();
    console.log('Total:', snap.size);
    const docs = [];
    snap.forEach(d => {
        const data = d.data();
        let ts = 'unknown';
        try { ts = data.timestamp.toDate ? data.timestamp.toDate().toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}) : String(data.timestamp); } catch(e) { ts = String(data.timestamp); }
        docs.push({ id: d.id, ts, status: data.status, className: data.className, type: data.type });
    });
    docs.forEach(d => console.log(d.id, '|', d.ts, '|', d.status, '|', d.className, '|', d.type));
    
    // Delete ALL except the first valid morning one
    if (docs.length > 1) {
        // Sort by time, keep only the first one (morning 하타)
        console.log('\nDeleting duplicates...');
        let kept = false;
        for (const doc of snap.docs) {
            const data = doc.data();
            if (!kept && data.className === '하타' && data.status === 'valid') {
                kept = true;
                console.log('KEEPING:', doc.id);
                continue;
            }
            // Delete everything else
            await doc.ref.delete();
            console.log('DELETED:', doc.id);
        }
        // Restore credits for deleted count
        const deletedCount = docs.length - 1;
        if (deletedCount > 0) {
            const memberId = snap.docs[0].data().memberId;
            await db.doc(`studios/boksaem-yoga/members/${memberId}`).update({
                credits: admin.firestore.FieldValue.increment(deletedCount),
                attendanceCount: admin.firestore.FieldValue.increment(-deletedCount)
            });
            console.log(`Restored ${deletedCount} credits to 정계수`);
        }
    }
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
