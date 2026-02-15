/**
 * Firestore 복합 인덱스 누락 여부 검증용 스크립트
 */
const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require('../service-account-key.json')) });
}
const db = admin.firestore();

(async () => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const branchId = 'mapo';
    
    console.log(`검증 쿼리: date=${today}, branchId=${branchId}, orderBy=timestamp desc`);
    
    try {
        const q = db.collection('attendance')
            .where('date', '==', today)
            .where('branchId', '==', branchId)
            .orderBy('timestamp', 'desc');
            
        const snap = await q.get();
        console.log(`성공: ${snap.docs.length}건 조회됨`);
    } catch (e) {
        console.error(`실패: ${e.message}`);
        if (e.message.indexOf('index') !== -1) {
            console.log('\n🚨 복합 인덱스가 필요합니다! 🚨');
        }
    }
    
    process.exit(0);
})();
