/**
 * 광흥창 오늘 스케줄 확인
 */
const admin = require('firebase-admin');
if (admin.apps.length === 0) {
    const serviceAccount = require('../service-account-key.json');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function check() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    
    // 광흥창 오늘 스케줄
    const gwangKey = `gwangheungchang_${today}`;
    const docSnap = await db.collection('daily_classes').doc(gwangKey).get();
    
    if (docSnap.exists) {
        const classes = docSnap.data().classes || [];
        console.log(`📅 광흥창 ${today} 스케줄 (${classes.length}개 수업):\n`);
        classes.forEach(c => {
            console.log(`  ${c.time} | ${c.className} | ${c.instructor} | duration: ${c.duration || 60}분 | status: ${c.status || 'active'}`);
        });
    } else {
        console.log('광흥창 오늘 스케줄 없음');
    }
    
    // 마포도 확인
    const mapoKey = `mapo_${today}`;
    const mapoSnap = await db.collection('daily_classes').doc(mapoKey).get();
    
    if (mapoSnap.exists) {
        const classes = mapoSnap.data().classes || [];
        console.log(`\n📅 마포 ${today} 스케줄 (${classes.length}개 수업):\n`);
        classes.forEach(c => {
            console.log(`  ${c.time} | ${c.className} | ${c.instructor} | duration: ${c.duration || 60}분 | status: ${c.status || 'active'}`);
        });
    }
    
    // 박유미, 김성희 출석 확인
    console.log('\n--- 박유미, 김성희 출석 기록 ---\n');
    const attSnap = await db.collection('attendance')
        .where('date', '==', today)
        .get();
    
    for (const doc of attSnap.docs) {
        const att = doc.data();
        if (att.memberName === '박유미' || att.memberName === '김성희') {
            console.log(`  ${att.memberName} | ${att.className} | ${att.instructor} | branchId: ${att.branchId} | time: ${att.timestamp}`);
        }
    }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
