const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const STUDIO_ID = 'boksaem-yoga';

async function detailCheck() {
    console.log('=== 비정상 date 레코드 상세 조사 ===\n');

    // Find the 2 ghost records
    const snap = await db.collection('studios').doc(STUDIO_ID)
        .collection('attendance')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();

    const ghosts = [];
    snap.forEach(doc => {
        const d = doc.data();
        // ISO format date field (contains 'T')
        if (d.date && d.date.includes('T')) {
            ghosts.push({ id: doc.id, ...d });
        }
    });

    console.log(`비정상 date 레코드: ${ghosts.length}건\n`);
    
    for (const g of ghosts) {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`문서 ID: ${g.id}`);
        console.log(`\n[전체 필드]`);
        const { id, ...raw } = g;
        console.log(JSON.stringify(raw, null, 2));

        // 회원 정보 확인
        if (g.memberId) {
            try {
                let mSnap = await db.collection('studios').doc(STUDIO_ID)
                    .collection('members').doc(g.memberId).get();
                if (mSnap.exists) {
                    const m = mSnap.data();
                    console.log(`\n[회원 정보]`);
                    console.log(`  이름: ${m.name}`);
                    console.log(`  멤버십: ${m.membershipType}`);
                    console.log(`  잔여: ${m.credits}회`);
                    console.log(`  기간: ${m.startDate} ~ ${m.endDate}`);
                    console.log(`  lastAttendance: ${m.lastAttendance}`);
                    console.log(`  attendanceCount: ${m.attendanceCount}`);
                } else {
                    console.log(`\n[회원 정보] 존재하지 않음 (삭제된 회원?)`);
                }
            } catch(e) {
                console.log(`  회원 조회 오류: ${e.message}`);
            }
        }
        console.log('');
    }

    // Check: was this created by adminAddAttendanceCall or checkInMemberV2Call?
    console.log('\n=== 원인 분석 ===');
    for (const g of ghosts) {
        console.log(`\n${g.memberName}:`);
        console.log(`  type: ${g.type} → ${g.type === 'manual' ? '수동 출석 (adminAddAttendanceCall)' : g.type === 'checkin' ? '키오스크 체크인' : '알 수 없음'}`);
        console.log(`  date 필드: "${g.date}" (비정상 - YYYY-MM-DD 형식이어야 함)`);
        console.log(`  classTime: "${g.classTime}" (비정상 - UTC 시간이 그대로 들어감)`);
        console.log(`  timestamp: "${g.timestamp}"`);
        
        if (g.date && g.date.includes('T')) {
            const expectedDate = g.date.split('T')[0];
            console.log(`  → 정상 date 값: "${expectedDate}"`);
        }
    }

    process.exit(0);
}

detailCheck().catch(err => {
    console.error(err);
    process.exit(1);
});
