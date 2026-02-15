/**
 * 오늘 전체 출석 기록 상세 확인 (강사 앱 조회 기준 분석용)
 */
const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require('../service-account-key.json')) });
}
const db = admin.firestore();

(async () => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    console.log(`조회 날짜: ${today}`);
    
    const snap = await db.collection('attendance')
        .where('date', '==', today)
        .get();
        
    console.log(`오늘 총 출석 건수: ${snap.docs.length}`);
    
    snap.docs.forEach(d => {
        const a = d.data();
        console.log(`--- [${a.memberName}] ---`);
        console.log(`기록 시간: ${a.timestamp}`);
        console.log(`수업: ${a.className}`);
        console.log(`강사: ${a.instructor}`);
        console.log(`지점 ID: ${a.branchId}`);
        console.log(`회원 ID: ${a.memberId}`);
        console.log(`상태: ${a.status || 'normal'}`);
    });
    
    process.exit(0);
})();
