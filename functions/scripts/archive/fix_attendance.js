const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixAttendance() {
    const today = '2026-02-15';
    const targetNames = ['박미진', '이수연'];
    
    console.log(`[FIX] 오늘(${today}) 출석 기록에서 자율수련 → 마이솔 수정 시작...`);
    
    const snap = await db.collection('attendance')
        .where('date', '==', today)
        .where('branchId', '==', 'gwangheungchang')
        .get();
    
    console.log(`[FIX] 광흥창 오늘 출석 총 ${snap.docs.length}건`);
    
    let fixedCount = 0;
    
    for (const doc of snap.docs) {
        const data = doc.data();
        if (targetNames.includes(data.memberName) && data.className === '자율수련') {
            console.log(`  → ${data.memberName}: "${data.className}" (${data.instructor || '미지정'}) → "마이솔" (원장)`);
            
            await doc.ref.update({
                className: '마이솔',
                instructor: '원장'
            });
            fixedCount++;
        }
    }
    
    console.log(`\n[FIX] 완료: ${fixedCount}건 수정됨`);
}

fixAttendance().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
