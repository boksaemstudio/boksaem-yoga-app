const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function investigate() {
    console.log('Loading members...');
    const membersSnap = await db.collection('members').get();
    const withUpcoming = [];
    const withTBD = [];
    
    membersSnap.forEach(doc => {
        const d = doc.data();
        if (d.upcomingMembership) {
            withUpcoming.push({ id: doc.id, name: d.name, upcoming: d.upcomingMembership, startDate: d.startDate, endDate: d.endDate, credits: d.credits });
        }
        if ((d.startDate === 'TBD' || d.endDate === 'TBD') && d.attendanceCount > 0) {
            withTBD.push({ id: doc.id, name: d.name, startDate: d.startDate, endDate: d.endDate, credits: d.credits, attendanceCount: d.attendanceCount });
        }
    });
    
    console.log('\n=== upcomingMembership이 남아있는 회원 ===');
    withUpcoming.forEach(m => console.log(JSON.stringify(m)));
    console.log('총:', withUpcoming.length, '명');
    
    console.log('\n=== startDate/endDate=TBD인데 출석 있는 회원 ===');
    withTBD.forEach(m => console.log(JSON.stringify(m)));
    console.log('총:', withTBD.length, '명');
    
    // sales에서 startDate=TBD 찾기
    console.log('\nLoading sales...');
    const salesSnap = await db.collection('sales').get();
    const tbdSales = [];
    salesSnap.forEach(doc => {
        const d = doc.data();
        if (d.startDate === 'TBD' || d.endDate === 'TBD') {
            tbdSales.push({ id: doc.id, memberName: d.memberName, memberId: d.memberId, item: d.item, date: d.date, startDate: d.startDate, endDate: d.endDate });
        }
    });
    console.log('\n=== sales에 TBD 남은 레코드 ===');
    tbdSales.forEach(s => console.log(JSON.stringify(s)));
    console.log('총:', tbdSales.length, '건');
}
investigate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
