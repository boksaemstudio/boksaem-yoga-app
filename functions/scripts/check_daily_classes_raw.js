/**
 * 오늘 전체 수업 정보(daily_classes)의 로우 데이터 확인용
 */
const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require('../service-account-key.json')) });
}
const db = admin.firestore();

(async () => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    console.log(`조회 날짜: ${today}`);
    
    // 전체 지점 오늘 수업 조회
    const snap = await db.collection('daily_classes')
        .where('date', '==', today)
        .get();
        
    console.log(`오늘 총 수업 수: ${snap.docs.length}`);
    
    snap.docs.forEach(d => {
        console.log(`\n--- Document ID: ${d.id} ---`);
        console.log(JSON.stringify(d.data(), null, 2));
    });
    
    process.exit(0);
})();
