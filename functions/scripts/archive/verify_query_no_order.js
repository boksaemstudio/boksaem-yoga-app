/**
 * orderBy 없이 다중 where 쿼리 작동 여부 확인
 */
const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require('../service-account-key.json')) });
}
const db = admin.firestore();

(async () => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const branchId = 'mapo';
    
    console.log(`검증 쿼리: date=${today}, branchId=${branchId} (NO orderBy)`);
    
    try {
        const q = db.collection('attendance')
            .where('date', '==', today)
            .where('branchId', '==', branchId);
            
        const snap = await q.get();
        console.log(`성공: ${snap.docs.length}건 조회됨`);
        snap.docs.forEach(d => console.log(` - ${d.data().memberName} (${d.data().timestamp})`));
    } catch (e) {
        console.error(`실패: ${e.message}`);
    }
    
    process.exit(0);
})();
