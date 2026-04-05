const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

(async () => {
    const today = '2026-04-05';
    const attSnap = await db.collection('studios/boksaem-yoga/attendance')
        .where('date', '==', today)
        .get();
    
    const docs = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    docs.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
    
    console.log(`\n📋 복샘요가 ${today} 출석 기록 (${docs.length}건) — 시간순\n`);
    docs.forEach(d => {
        const hasPhoto = !!d.photoUrl;
        const time = d.timestamp || '?';
        const kst = d.timestamp ? new Date(d.timestamp).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '?';
        console.log(`  ${kst} | ${(d.memberName || '?').padEnd(8)} | photo: ${hasPhoto ? '✅' : '❌'} | source: ${(d.source || '?').padEnd(8)} | type: ${(d.type || '?').padEnd(10)} | className: ${d.className || '?'}`);
        if (!hasPhoto) {
            console.log(`    ⚠️  photoUrl: ${d.photoUrl || 'NONE'}, photoStatus: ${d.photoStatus || 'NONE'}`);
            console.log(`    ⚠️  전체 필드:`, JSON.stringify(d, null, 0).substring(0, 300));
        }
    });
    process.exit(0);
})();
