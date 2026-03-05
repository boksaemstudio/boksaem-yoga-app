/**
 * 문정훈 출석 지점 확인
 */
const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require('../service-account-key.json')) });
}
const db = admin.firestore();

(async () => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const snap = await db.collection('attendance')
        .where('date', '==', today)
        .get();
        
    for (const d of snap.docs) {
        const a = d.data();
        if (a.memberName === '문정훈 tc6기' || (a.memberName && a.memberName.includes('문정훈'))) {
            console.log(`\n=== 문정훈 출석 정보 ===`);
            console.log(`이름: ${a.memberName}`);
            console.log(`시간: ${a.timestamp}`);
            console.log(`수업: ${a.className} (${a.instructor})`);
            console.log(`지점ID: ${a.branchId}`); // 여기가 중요
            console.log(`=======================`);
        }
    }
    process.exit(0);
})();
