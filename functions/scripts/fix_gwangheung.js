/**
 * 성예린 출석 데이터 확인 및 수정
 */
const admin = require('firebase-admin');
if (admin.apps.length === 0) {
    const serviceAccount = require('../service-account-key.json');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function fix() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const attSnap = await db.collection('attendance')
        .where('date', '==', today)
        .where('branchId', '==', 'gwangheungchang')
        .get();
    
    for (const doc of attSnap.docs) {
        const att = doc.data();
        if (att.memberName === '성예린') {
            console.log(`현재: ${att.memberName} | ${att.className} | ${att.instructor} | ${att.timestamp}`);
            
            if (att.className === '자율수련' || att.instructor === '미지정') {
                await doc.ref.update({ className: '마이솔', instructor: '원장' });
                console.log(`✅ 수정 완료: 마이솔 (원장)`);
            } else {
                console.log('이미 정상 데이터');
            }
        }
    }
}

fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
