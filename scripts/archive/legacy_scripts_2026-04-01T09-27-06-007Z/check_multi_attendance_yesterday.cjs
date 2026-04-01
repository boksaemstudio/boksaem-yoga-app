const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const tenantId = 'boksaem-yoga';
const tdb = db.collection('studios').doc(tenantId);

async function run() {
    const yesterday = '2026-03-30';
    console.log(`\n📅 ${yesterday} (어제) 2회 이상 출석한 회원 조회\n`);
    console.log('='.repeat(60));

    // attendance 컬렉션에서 어제 데이터 조회
    const attSnap = await tdb.collection('attendance')
        .where('date', '==', yesterday)
        .get();

    // deletedAt 없는 유효한 출석만 필터링
    const validRecords = [];
    attSnap.forEach(doc => {
        const d = doc.data();
        if (d.deletedAt) return; // soft-deleted 제외
        validRecords.push({ docId: doc.id, ...d });
    });

    console.log(`총 유효 출석 기록: ${validRecords.length}건\n`);

    // memberId별 그룹핑
    const byMember = new Map();
    validRecords.forEach(rec => {
        const mid = rec.memberId;
        if (!byMember.has(mid)) byMember.set(mid, []);
        byMember.get(mid).push(rec);
    });

    // 2회 이상 출석한 회원만 필터
    const multiAttendance = [];
    for (const [memberId, records] of byMember.entries()) {
        if (records.length >= 2) {
            // 회원 이름 조회
            let name = records[0].memberName || '알수없음';
            if (name === '알수없음') {
                const mDoc = await tdb.collection('members').doc(memberId).get();
                if (mDoc.exists) name = mDoc.data().name || '알수없음';
            }
            multiAttendance.push({ memberId, name, records });
        }
    }

    if (multiAttendance.length === 0) {
        console.log('❌ 어제 2회 이상 출석한 회원이 없습니다.');
    } else {
        console.log(`✅ 2회 이상 출석 회원: ${multiAttendance.length}명\n`);

        multiAttendance.sort((a, b) => b.records.length - a.records.length);

        multiAttendance.forEach(({ memberId, name, records }) => {
            console.log(`👤 ${name} (${records.length}회 출석)`);
            records.sort((a, b) => {
                const ta = a.timestamp || a.createdAt || '';
                const tb = b.timestamp || b.createdAt || '';
                return ta < tb ? -1 : ta > tb ? 1 : 0;
            });
            records.forEach((r, i) => {
                const time = r.timestamp || r.createdAt || '시간없음';
                const branch = r.branchId || '지점없음';
                const className = r.className || r.classTitle || '';
                let timeStr = time;
                try {
                    if (typeof time === 'object' && time.toDate) {
                        timeStr = time.toDate().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
                    } else if (typeof time === 'string') {
                        timeStr = new Date(time).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
                    }
                } catch(e) {}
                console.log(`   ${i+1}회차: ${timeStr} | ${branch} | ${className}`);
            });
            console.log('');
        });
    }

    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
