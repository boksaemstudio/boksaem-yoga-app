/**
 * 오늘 출석한 회원들의 attendanceCount 확인
 */
const admin = require('firebase-admin');
if (admin.apps.length === 0) {
    const serviceAccount = require('../service-account-key.json');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function check() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    
    // 오늘 출석 기록 조회
    const attSnap = await db.collection('attendance')
        .where('date', '==', today)
        .get();
    
    console.log(`📅 ${today} 출석 ${attSnap.size}건\n`);
    
    for (const doc of attSnap.docs) {
        const att = doc.data();
        const memberSnap = await db.collection('members').doc(att.memberId).get();
        const member = memberSnap.exists ? memberSnap.data() : {};
        
        console.log(`  ${att.memberName}`);
        console.log(`    attendance.cumulativeCount: ${att.cumulativeCount}`);
        console.log(`    member.attendanceCount: ${member.attendanceCount}`);
        console.log(`    member.credits: ${member.credits}`);
        console.log(`    member.startDate: ${member.startDate}`);
        console.log(`    member.endDate: ${member.endDate}`);
        console.log('');
    }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
