const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require('../service-account-key.json')) });
}
const db = admin.firestore();

(async () => {
    // 1. 회원 데이터
    const membersSnap = await db.collection('members').get();
    let memberId = null;
    for (const d of membersSnap.docs) {
        const m = d.data();
        if (m.name && m.name.includes('황화정')) {
            memberId = d.id;
            console.log('=== 황화정 회원 데이터 ===');
            console.log('ID:', d.id);
            console.log('name:', m.name);
            console.log('startDate:', m.startDate);
            console.log('endDate:', m.endDate);
            console.log('credits:', m.credits);
            console.log('attendanceCount:', m.attendanceCount);
            console.log('branch:', m.branch);
            console.log('phone:', m.phone);
            console.log('membershipType:', m.membershipType);
            console.log('');
        }
    }

    // 2. 오늘 출석
    if (memberId) {
        const attSnap = await db.collection('attendance')
            .where('memberId', '==', memberId)
            .where('date', '==', '2026-02-15')
            .get();
        console.log(`=== 오늘 출석 (${attSnap.size}건) ===`);
        attSnap.docs.forEach(d => {
            const a = d.data();
            console.log(`  ${a.className} | ${a.instructor} | ${a.status} | ${a.timestamp}`);
            if (a.denialReason) console.log(`  denialReason: ${a.denialReason}`);
        });
    }

    // 3. 매출 기록
    const salesSnap = await db.collection('sales').get();
    console.log('\n=== 매출 기록 ===');
    for (const d of salesSnap.docs) {
        const s = d.data();
        if (s.memberName && s.memberName.includes('황화정')) {
            console.log(`  날짜: ${s.date} | 금액: ${s.amount} | 기간: ${s.months}개월 | 시작: ${s.startDate} | 종료: ${s.endDate} | 횟수: ${s.credits}`);
        }
    }

    process.exit(0);
})();
