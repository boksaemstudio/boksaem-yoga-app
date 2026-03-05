/**
 * 오늘 마포 지점의 수업 정보(daily_classes) 확인용
 */
const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require('../service-account-key.json')) });
}
const db = admin.firestore();

(async () => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    console.log(`조회 날짜: ${today}`);
    
    const snap = await db.collection('daily_classes')
        .where('date', '==', today)
        .where('branchId', '==', 'mapo')
        .get();
        
    console.log(`마포 지점 오늘 수업 수: ${snap.docs.length}`);
    
    snap.docs.forEach(d => {
        const c = d.data();
        console.log(`--- [${c.title}] ---`);
        console.log(`시간: ${c.time}`);
        console.log(`강사: ${c.instructor}`);
        console.log(`상태: ${c.status || 'normal'}`);
    });
    
    process.exit(0);
})();
