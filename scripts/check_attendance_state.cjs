const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function checkAttendance() {
    const tenantDb = db.collection('studios').doc('boksaem-yoga');
    
    // 오늘 날짜의 마이솔(희정) 출석 전체 확인
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const startOfDay = new Date(`${today}T00:00:00+09:00`);
    const endOfDay = new Date(`${today}T23:59:59+09:00`);
    
    const snap = await tenantDb.collection('attendance')
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
        .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
        .get();
        
    console.log(`오늘 등록된 총 출석: ${snap.size}건`);
    
    const mysoleLogs = [];
    snap.forEach(d => {
        const data = d.data();
        if (data.className === '마이솔') {
            mysoleLogs.push({ id: d.id, ...data });
        }
    });
    
    console.log(`\n오늘 등록된 마이솔 출석: ${mysoleLogs.length}건`);
    
    mysoleLogs.forEach(d => {
        // 보기 편하게 시간 변환
        const time = d.timestamp?.toDate ? d.timestamp.toDate().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : 'No timestamp';
        console.log(`- ${d.memberName} | 지점:${d.branchId} | 상태:${d.status} | 강사:${d.instructor} | 시간:${time} | note:${d.note}`);
    });
}

checkAttendance().catch(console.error).finally(() => process.exit(0));
