/**
 * 오늘 출석 데이터에 startDate 추가
 */
const admin = require('firebase-admin');
if (admin.apps.length === 0) {
    const serviceAccount = require('../service-account-key.json');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function fix() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const attSnap = await db.collection('attendance').where('date', '==', today).get();
    
    console.log(`📅 ${today} 출석 ${attSnap.size}건에 startDate 추가\n`);
    
    const batch = db.batch();
    let count = 0;
    
    for (const doc of attSnap.docs) {
        const att = doc.data();
        if (!att.startDate && att.memberId) {
            const memberSnap = await db.collection('members').doc(att.memberId).get();
            if (memberSnap.exists) {
                const startDate = memberSnap.data().startDate;
                if (startDate) {
                    batch.update(doc.ref, { startDate });
                    count++;
                    console.log(`  ✅ ${att.memberName}: startDate = ${startDate}`);
                }
            }
        }
    }
    
    if (count > 0) {
        await batch.commit();
        console.log(`\n✅ ${count}건 업데이트 완료`);
    } else {
        console.log('업데이트 필요 없음');
    }
}

fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
