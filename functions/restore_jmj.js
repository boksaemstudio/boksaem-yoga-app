const admin = require('firebase-admin');
const sa = require('./service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const MEMBER_ID = 'IFxQ1R74PwZpHHa3rAn3';

async function run() {
    // 1. Count ALL attendance records in new app
    const attSnap = await db.collection('attendance')
        .where('memberId', '==', MEMBER_ID)
        .get();

    const validRecords = [];
    attSnap.forEach(d => {
        const data = d.data();
        if (data.status === 'valid') {
            validRecords.push({ date: data.date, class: data.className, timestamp: data.timestamp });
        }
    });

    validRecords.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    console.log(`=== 총 출석 기록 (valid만): ${validRecords.length}회 ===`);
    validRecords.forEach(r => {
        console.log(`  ${r.date} | ${r.class}`);
    });

    // Old CRM: 14회 남음
    const oldRemaining = 14;
    const newCredits = oldRemaining - validRecords.length;

    console.log(`\n=== 계산 ===`);
    console.log(`이전 CRM 잔여: ${oldRemaining}회`);
    console.log(`새 앱 출석: ${validRecords.length}회`);
    console.log(`복원할 잔여 횟수: ${newCredits}회`);

    // 2. Restore: set current membership to old data, advance registration to upcomingMembership
    const updateData = {
        // Restore current (old) membership
        membershipType: 'intensive',
        startDate: '2025-08-22',
        endDate: '2026-02-27',
        credits: newCredits,
        attendanceCount: validRecords.length,
        // Store advance registration as upcoming
        upcomingMembership: {
            membershipType: 'intensive',
            credits: 96,
            startDate: '2026-03-01',
            endDate: '2026-08-31'
        },
        updatedAt: new Date().toISOString()
    };

    console.log(`\n=== 적용할 데이터 ===`);
    console.log(JSON.stringify(updateData, null, 2));

    await db.collection('members').doc(MEMBER_ID).update(updateData);
    console.log('\n✅ 장민정 회원 데이터 복원 완료!');

    process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
