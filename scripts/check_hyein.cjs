const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function check() {
    // 루트
    const r = await db.collection('members').where('name', '==', '김혜인').get();
    console.log('=== 루트(이전) ===');
    r.forEach(d => { const x = d.data(); console.log(JSON.stringify({ name: x.name, credits: x.credits, membershipType: x.membershipType, endDate: x.endDate, branchId: x.branchId, regDate: x.regDate })); });

    // 테넌트
    const t = await db.collection('studios/boksaem-yoga/members').where('name', '==', '김혜인').get();
    console.log('=== 테넌트(현재) ===');
    t.forEach(d => { const x = d.data(); console.log(JSON.stringify({ name: x.name, credits: x.credits, membershipType: x.membershipType, endDate: x.endDate, branchId: x.branchId, regDate: x.regDate })); });

    // 매출 기록 확인
    if (!t.empty) {
        const memberId = t.docs[0].id;
        const sales = await db.collection(`studios/boksaem-yoga/sales`).where('memberId', '==', memberId).get();
        console.log(`\n=== 매출 기록 (${sales.size}건) ===`);
        sales.forEach(d => { const x = d.data(); console.log(JSON.stringify({ date: x.date, amount: x.amount, credits: x.credits, type: x.type, membershipType: x.membershipType })); });
    }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
