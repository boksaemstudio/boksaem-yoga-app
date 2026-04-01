const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tdb = db.collection('studios').doc('boksaem-yoga');

async function run() {
    console.log('='.repeat(70));
    console.log('  3/30 출석 현황 - 지점별 상세');
    console.log('='.repeat(70));

    // 현재 attendance
    const attSnap = await tdb.collection('attendance')
        .where('date', '==', '2026-03-30')
        .get();

    const byBranch = { gwangheungchang: [], mapo: [], other: [] };
    attSnap.forEach(doc => {
        const d = doc.data();
        if (d.deletedAt) return;
        const branch = d.branchId || 'other';
        const bucket = byBranch[branch] || byBranch.other;
        bucket.push({ docId: doc.id, ...d });
    });

    // 광흥창
    console.log(`\n📍 광흥창: ${byBranch.gwangheungchang.length}명`);
    byBranch.gwangheungchang.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
    byBranch.gwangheungchang.forEach((r, i) => {
        const t = r.timestamp ? new Date(r.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }) : '';
        console.log(`  ${i+1}. ${r.memberName} | ${r.className} | ${r.status} | ${t} | ${r.docId}`);
    });

    // 마포
    console.log(`\n📍 마포: ${byBranch.mapo.length}명`);
    byBranch.mapo.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
    byBranch.mapo.forEach((r, i) => {
        const t = r.timestamp ? new Date(r.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }) : '';
        console.log(`  ${i+1}. ${r.memberName} | ${r.className} | ${r.status} | ${t} | ${r.docId}`);
    });

    // practice_events에서 마포 확인 (출석은 없지만 이벤트가 있는지)
    console.log(`\n--- 3/30 practice_events에서 마포 회원 확인 ---`);
    const peSnap = await tdb.collection('practice_events')
        .where('date', '==', '2026-03-30')
        .get();

    const peMembers = new Set();
    const peRecords = [];
    peSnap.forEach(doc => {
        const d = doc.data();
        peMembers.add(d.memberId);
        peRecords.push({ docId: doc.id, memberId: d.memberId });
    });

    // 마포 회원 목록 조회
    const mapoMembersSnap = await tdb.collection('members')
        .where('branchId', '==', 'mapo')
        .get();

    const mapoMembers = new Map();
    mapoMembersSnap.forEach(doc => {
        mapoMembers.set(doc.id, doc.data());
    });

    // practice_events에 있지만 attendance에 없는 마포 회원
    const attMemberIds = new Set(byBranch.mapo.map(r => r.memberId));
    let missingCount = 0;
    console.log('\n🔍 practice_events에 있지만 attendance에 없는 마포 회원:');
    for (const pe of peRecords) {
        const member = mapoMembers.get(pe.memberId);
        if (member && !attMemberIds.has(pe.memberId)) {
            missingCount++;
            console.log(`  ${missingCount}. ${member.name} (${pe.memberId}) | PE docId: ${pe.docId}`);
        }
    }
    if (missingCount === 0) console.log('  없음');

    // 어제 마포 수업 스케줄도 확인
    console.log('\n--- 3/30 마포 스케줄 확인 ---');
    const schedSnap = await tdb.collection('schedules')
        .where('branchId', '==', 'mapo')
        .get();
    
    const dayOfWeek = new Date('2026-03-30').getDay(); // 0=일, 1=월...
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    console.log(`3/30은 ${dayNames[dayOfWeek]}요일`);
    
    schedSnap.forEach(doc => {
        const d = doc.data();
        if (d.days && d.days.includes(dayNames[dayOfWeek])) {
            console.log(`  📅 ${d.time || d.startTime} ${d.className || d.title} (${d.instructor || ''})`);
        }
    });

    console.log(`\n요약: 광흥창 ${byBranch.gwangheungchang.length}명 / 마포 ${byBranch.mapo.length}명`);
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
