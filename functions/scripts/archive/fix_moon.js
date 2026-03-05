/**
 * 문정훈 출석 데이터 수정
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
        if (a.memberName === '문정훈ttc6기' || (a.memberName && a.memberName.includes('문정훈'))) {
            if (a.className === '자율수련' || a.className === '하타') {
            console.log(`Found: ${a.memberName} | ${a.timestamp}`);
            await d.ref.update({
                className: '마이솔',
                instructor: '원장'
            });
            console.log('✅ Re-Fixed: 마이솔 (원장)');
        }
    }
}
    process.exit(0);
})();
