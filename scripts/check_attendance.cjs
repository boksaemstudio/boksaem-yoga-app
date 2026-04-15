const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function check() {
    const tenantDb = db.collection('studios').doc('boksaem-yoga');
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    console.log('오늘:', today);

    // 마이솔 수업 출석 확인 (인덱스 없이)
    const mysolSnap = await tenantDb.collection('attendance')
        .where('className', '==', '마이솔')
        .limit(20)
        .get();
    
    console.log('\n마이솔 수업 출석:', mysolSnap.size + '건');
    mysolSnap.forEach(d => {
        const data = d.data();
        const ts = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        console.log(`  ${data.memberName || '?'} | ${ts.toLocaleString('ko-KR', {timeZone:'Asia/Seoul'})} | branch:${data.branchId} | status:${data.status}`);
    });

    // 지점 설정 확인
    const studioDoc = await tenantDb.get();
    const settings = studioDoc.data()?.settings;
    console.log('\n지점 설정:', JSON.stringify(settings?.BRANCHES, null, 2));
}

check().catch(console.error).finally(() => process.exit(0));
