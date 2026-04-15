const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function fix() {
    const tenantDb = db.collection('studios').doc('boksaem-yoga');
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    
    // 오늘 등록한 마이솔 수업 출석 찾기 (method=manual이고 note에 '광흥창 오후2시' 포함)
    const snap = await tenantDb.collection('attendance')
        .where('method', '==', 'manual')
        .where('className', '==', '마이솔')
        .get();
    
    const todayDocs = snap.docs.filter(d => {
        const data = d.data();
        return data.note && data.note.includes('2026-04-14');
    });

    console.log(`오늘 수동 등록한 마이솔 출석: ${todayDocs.length}건`);
    
    const batch = db.batch();
    const newTimestamp = new Date(`${today}T13:30:00+09:00`); // 오후 1시 30분

    todayDocs.forEach(doc => {
        const data = doc.data();
        console.log(`  수정: ${data.memberName} | 14:00→13:30, 마이솔→마이솔(희정)`);
        batch.update(doc.ref, {
            timestamp: admin.firestore.Timestamp.fromDate(newTimestamp),
            instructor: '희정',
            note: '관리자 수동 등록 (2026-04-14 광흥창 오후1:30 마이솔 희정선생님)'
        });
    });

    await batch.commit();
    console.log(`\n✅ ${todayDocs.length}건 수정 완료! (시간: 13:30, 강사: 희정)`);
}

fix().catch(console.error).finally(() => process.exit(0));
