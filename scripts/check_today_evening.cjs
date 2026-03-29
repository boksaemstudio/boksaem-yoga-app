const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function f() {
    // 오늘 저녁 출석 (한국시간 18:00~22:00 = UTC 09:00~13:00)  
    const s = await db.collection('studios/boksaem-yoga/attendance')
        .where('date', '==', '2026-03-29')
        .get();
    
    const recs = s.docs.map(d => {
        const data = d.data();
        let ts = data.timestamp;
        if (ts && ts.toDate) ts = ts.toDate().toISOString();
        return { id: d.id, memberName: data.memberName, memberId: data.memberId, className: data.className, status: data.status, denialReason: data.denialReason, ts, branchId: data.branchId };
    });
    
    // 시간순 정렬
    recs.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
    
    console.log('오늘(3/29) 총 출석:', recs.length, '건\n');
    
    // 시진우 관련만 먼저
    const siRecs = recs.filter(r => (r.memberName || '').includes('시진우') || (r.memberName || '').includes('진우'));
    console.log('시진우 관련:', siRecs.length, '건');
    siRecs.forEach(r => console.log(' ', r.ts, r.memberName, r.className, r.status, r.denialReason || '-'));
    
    // denied 기록 
    const denied = recs.filter(r => r.status === 'denied' || r.denialReason);
    console.log('\n거부된 출석:', denied.length, '건');
    denied.forEach(r => console.log(' ', r.ts, r.memberName, r.status, r.denialReason));

    // 저녁 시간대 (UTC 10:00+ = KST 19:00+)
    const evening = recs.filter(r => {
        if (!r.ts) return false;
        const h = new Date(r.ts).getUTCHours();
        return h >= 9; // UTC 9 = KST 18시 이후
    });
    console.log('\n저녁 시간대 출석:', evening.length, '건');
    evening.forEach(r => console.log(' ', r.ts, r.memberName, r.className, r.status, r.denialReason || '-'));

    process.exit(0);
}
f().catch(e => { console.error(e); process.exit(1); });
