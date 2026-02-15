/**
 * 황화정 데이터 교정:
 * 1. 중복 매출 1건 삭제
 * 2. 회원 startDate 수정 (2026-02-25 → 2026-02-15)
 * 3. 회원 branch 설정 (광흥창)
 */
const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require('../service-account-key.json')) });
}
const db = admin.firestore();

(async () => {
    // 1. 중복 매출 삭제
    const salesSnap = await db.collection('sales').get();
    const hwangSales = [];
    
    for (const d of salesSnap.docs) {
        const s = d.data();
        if (s.memberName && s.memberName.includes('황화정') && s.amount === 832000) {
            hwangSales.push({ id: d.id, ...s });
        }
    }
    
    console.log(`황화정 832,000원 매출: ${hwangSales.length}건`);
    
    if (hwangSales.length > 1) {
        // 첫 번째 것만 남기고 나머지 삭제
        for (let i = 1; i < hwangSales.length; i++) {
            await db.collection('sales').doc(hwangSales[i].id).delete();
            console.log(`✅ 중복 매출 삭제: ${hwangSales[i].id}`);
        }
    }
    
    // 2. 회원 데이터 교정
    const membersSnap = await db.collection('members').get();
    for (const d of membersSnap.docs) {
        const m = d.data();
        if (m.name && m.name.includes('황화정')) {
            console.log(`\n현재: startDate=${m.startDate}, endDate=${m.endDate}, branch=${m.branch || m.homeBranch}`);
            
            // startDate를 오늘로, branch를 광흥창으로 설정
            await d.ref.update({
                startDate: '2026-02-15',
                homeBranch: 'gwangheungchang'
            });
            console.log('✅ startDate → 2026-02-15, homeBranch → gwangheungchang');
        }
    }
    
    process.exit(0);
})();
