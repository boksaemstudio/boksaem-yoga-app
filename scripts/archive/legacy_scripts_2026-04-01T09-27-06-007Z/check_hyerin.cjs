const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const acc = require('../functions/service-account-key.json');
try { initializeApp({ credential: cert(acc) }); } catch(e) {}
const db = getFirestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    // 1. 회원 문서 조회
    const mSnap = await tdb.collection('members').where('phone', '==', '010-4633-0826').get();
    if (mSnap.empty) { console.log('회원 없음'); process.exit(0); }
    
    const doc = mSnap.docs[0];
    const d = doc.data();
    console.log('========== 박혜린 회원 문서 ==========');
    console.log('ID:', doc.id);
    console.log('이름:', d.name);
    console.log('regDate (등록일):', d.regDate);
    console.log('startDate (시작일):', d.startDate);
    console.log('endDate (종료일):', d.endDate);
    console.log('credits (잔여횟수):', d.credits);
    console.log('membershipType:', d.membershipType);
    console.log('duration:', d.duration);
    console.log('price:', d.price);
    console.log('upcoming:', JSON.stringify(d.upcomingMembership, null, 2));
    console.log('');

    // 2. 매출 기록 조회
    const sSnap = await tdb.collection('sales').where('memberId', '==', doc.id).get();
    console.log('========== 매출(Sales) 기록 ==========');
    sSnap.forEach(s => {
        const sd = s.data();
        console.log(`[${s.id}] ${sd.item || '항목없음'} | ${sd.amount}원 | 결제일:${sd.date} | start:${sd.startDate} | end:${sd.endDate}`);
    });
    console.log('');

    // 3. 최근 출석 기록
    const aSnap = await tdb.collection('attendance').where('memberId', '==', doc.id).orderBy('timestamp', 'desc').limit(5).get();
    console.log('========== 최근 출석 5건 ==========');
    aSnap.forEach(a => {
        const ad = a.data();
        console.log(`${ad.date} ${ad.classTime||''} | ${ad.className} | status:${ad.status} | credits:${ad.credits}`);
    });

    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
