const admin = require('firebase-admin');
const serviceAccount = require('./functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function investigate() {
    const memberId = 'pKISeGLzDLG7kXLEHKhd';
    const name = '정다솔';
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

    console.log(`=== 회원 정보: ${name} (${memberId}) ===`);

    console.log(`\n=== 1. 오늘 출석 기록 (Date: ${today}) ===`);
    const attSnap = await db.collection('attendance')
        .where('memberId', '==', memberId)
        .get();
    
    let matchedToday = [];
    attSnap.forEach(doc => {
        const data = doc.data();
        if (data.date === today) {
            matchedToday.push({id: doc.id, ...data});
        }
    });
    
    if (matchedToday.length === 0) {
        console.log("오늘 출석 기록이 없습니다.");
    } else {
        matchedToday.forEach(item => console.log(JSON.stringify(item, null, 2)));
    }

    console.log(`\n=== 2. 전체 출석 기록 (최근 20건) ===`);
    const allAtt = [];
    attSnap.forEach(doc => allAtt.push(doc.data()));
    allAtt.sort((a, b) => b.timestamp?.localeCompare(a.timestamp) || 0);
    
    allAtt.slice(0, 20).forEach(data => {
        console.log(`[${data.date} ${data.time}] ${data.itemName || data.item} / ${data.instructor} (Status: ${data.status || 'N/A'})`);
    });

    console.log(`\n=== 3. 보류 중인 출석 (pending_attendance) ===`);
    const pendingSnap = await db.collection('pending_attendance')
        .where('memberId', '==', memberId)
        .get();
    
    pendingSnap.forEach(doc => {
        console.log(JSON.stringify({id: doc.id, ...doc.data()}, null, 2));
    });

    console.log(`\n=== 4. 관련 에러 로그 (전체 검색 후 필터링) ===`);
    // error_logs는 양이 많을 수 있으므로 최근 100건만 가져와서 필터링 (또는 timestamp 정렬)
    const errSnap = await db.collection('error_logs')
        .orderBy('timestamp', 'desc')
        .limit(200)
        .get();
    
    let relevantErrors = [];
    errSnap.forEach(doc => {
        const data = doc.data();
        const strData = JSON.stringify(data);
        if (data.memberId === memberId || strData.includes(memberId) || strData.includes(name)) {
            relevantErrors.push({id: doc.id, ...data});
        }
    });

    if (relevantErrors.length === 0) {
        console.log("관련 에러 로그를 찾을 수 없습니다.");
    } else {
        relevantErrors.forEach(err => {
            console.log(`[${err.timestamp}] ${err.error} | Context: ${err.context || 'N/A'}`);
        });
    }
}

investigate().then(() => {
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
