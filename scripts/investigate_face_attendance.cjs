/**
 * 긴급 전수조사: 오늘 안면인식 출석 전체 찾기
 * 
 * 컬렉션: studios/boksaem-yoga/attendance (date 필드 기준)
 * 목표: 오늘(2026-03-30) 모든 출석 기록을 가져와서, 
 *       안면인식으로 출석된 것을 식별
 */

const admin = require('../functions/node_modules/firebase-admin');
const sa = require('../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const db = admin.firestore();

async function run() {
    const STUDIO_ID = 'boksaem-yoga';
    const tdb = db.collection('studios').doc(STUDIO_ID);
    const todayKST = '2026-03-30';

    console.log(`\n🔍 전수조사 시작 - ${todayKST}`);
    console.log('='.repeat(70));

    // ============================
    // 1. 오늘 전체 출석 기록 조회
    // ============================
    console.log('\n📌 1. 오늘 전체 출석 로그 (studios/boksaem-yoga/attendance)');
    
    const attSnap = await tdb.collection('attendance')
        .where('date', '==', todayKST)
        .get();

    console.log(`   총 ${attSnap.size}건 발견\n`);

    const allRecords = [];
    attSnap.forEach(doc => {
        const d = doc.data();
        // Firestore Timestamp → ISO string 변환
        let ts = d.timestamp;
        if (ts && typeof ts === 'object' && ts.toDate) {
            ts = ts.toDate().toISOString();
        } else if (typeof ts !== 'string') {
            ts = '';
        }
        allRecords.push({ id: doc.id, ...d, timestamp: ts });
    });

    // 시간순 정렬
    allRecords.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));

    // 모든 기록 출력
    console.log('   #  | 시간 (KST)          | 이름      | 지점           | 수업            | method     | type       | status  | ID');
    console.log('   ' + '-'.repeat(140));
    
    allRecords.forEach((r, i) => {
        const time = r.timestamp 
            ? new Date(r.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })
            : 'N/A';
        const name = (r.memberName || 'unknown').padEnd(8);
        const branch = (r.branchId || '(없음)').padEnd(14);
        const cls = (r.className || '(없음)').padEnd(14);
        const method = (r.method || r.checkInMethod || '(없음)').padEnd(10);
        const type = (r.type || '(없음)').padEnd(10);
        const status = (r.status || '(없음)').padEnd(7);
        
        console.log(`   ${String(i+1).padStart(2)} | ${time.padEnd(19)} | ${name} | ${branch} | ${cls} | ${method} | ${type} | ${status} | ${r.id}`);
    });

    // ============================
    // 2. 안면인식 출석 식별
    // ============================
    console.log('\n\n📌 2. 안면인식 출석 식별');
    console.log('   판별 기준: type==="checkin" 이면서 오후~저녁(대표님이 OFF 이후) 시간대');
    console.log('   또는 method 필드가 "face"/"facial"인 경우\n');

    // 오후 3시 이후 자동 출석 의심건 (대표님이 오후에 끄셨으므로)
    const suspiciousRecords = [];
    
    for (const r of allRecords) {
        // 방법 1: method가 face/facial
        const isFaceMethod = ['face', 'facial', 'auto_face'].includes(r.method || r.checkInMethod || '');
        
        // 방법 2: type=checkin 인데 오후 늦은시간 (15시 이후) — 대표님이 OFF한 이후
        let isLateAutoCheckin = false;
        if (r.timestamp && r.type === 'checkin') {
            const kstHour = new Date(r.timestamp).getUTCHours() + 9;
            // 오후 3시(15시) 이후 키오스크 자동출석은 의심
            // (단, PIN 입력으로 출석한 것은 정상이므로 추가 확인 필요)
            if (kstHour >= 15) {
                isLateAutoCheckin = true;
            }
        }
        
        if (isFaceMethod || isLateAutoCheckin) {
            suspiciousRecords.push(r);
        }
    }

    if (suspiciousRecords.length > 0) {
        console.log(`   🚨 의심 건수: ${suspiciousRecords.length}건\n`);
        for (const r of suspiciousRecords) {
            const time = r.timestamp 
                ? new Date(r.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })
                : 'N/A';
            console.log(`   ⚠️ [${r.id}]`);
            console.log(`      이름: ${r.memberName} | 회원ID: ${r.memberId}`);
            console.log(`      시간: ${time}`);
            console.log(`      지점: ${r.branchId} | 수업: ${r.className}`);
            console.log(`      method: ${r.method || '(없음)'} | type: ${r.type}`);
            console.log(`      status: ${r.status}`);
            console.log('');
        }
    } else {
        console.log('   ℹ️ 명시적 안면인식 출석은 없음');
    }

    // ============================
    // 3. 대상 회원 현재 상태
    // ============================
    console.log('\n📌 3. 문제 회원 현재 상태 조회');
    
    const targetNames = ['이소현', '박송자', '이다솜'];
    
    for (const name of targetNames) {
        const snap = await tdb.collection('members').where('name', '==', name).get();
        if (snap.empty) {
            console.log(`\n   ❌ "${name}" - 검색 결과 없음`);
            // 비슷한 이름 검색
            const allMembers = await tdb.collection('members').get();
            const similar = [];
            allMembers.forEach(doc => {
                const n = doc.data().name || '';
                if (n.includes(name.charAt(0) + name.charAt(1)) || n.includes(name.slice(1))) {
                    similar.push({ id: doc.id, name: n });
                }
            });
            if (similar.length > 0) {
                console.log(`      유사 이름: ${similar.map(s => `${s.name}(${s.id})`).join(', ')}`);
            }
        } else {
            snap.forEach(doc => {
                const m = doc.data();
                console.log(`\n   👤 ${m.name} (${doc.id})`);
                console.log(`      phone: ${m.phone}`);
                console.log(`      credits: ${m.credits} / original: ${m.originalCredits}`);
                console.log(`      regDate: ${m.regDate} | startDate: ${m.startDate || '(없음)'} | endDate: ${m.endDate || '(없음)'}`);
                console.log(`      status: ${m.status} | attendanceCount: ${m.attendanceCount}`);
                console.log(`      lastAttendance: ${m.lastAttendance || '(없음)'}`);
                console.log(`      branchId: ${m.branchId}`);
                console.log(`      membershipType: ${m.membershipType}`);
                console.log(`      hasFaceDescriptor: ${m.hasFaceDescriptor}`);
                if (m.upcomingMembership) {
                    console.log(`      ⭐ upcomingMembership: ${JSON.stringify(m.upcomingMembership)}`);
                }

                // 이 회원의 오늘 출석 기록
                const memberLogs = allRecords.filter(r => r.memberId === doc.id);
                if (memberLogs.length > 0) {
                    console.log(`      📝 오늘 출석 (${memberLogs.length}건):`);
                    memberLogs.forEach(ml => {
                        const time = ml.timestamp
                            ? new Date(ml.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })
                            : 'N/A';
                        console.log(`         [${ml.id}] ${time} | ${ml.className} | type:${ml.type} | method:${ml.method || '(없음)'} | status:${ml.status}`);
                    });
                } else {
                    console.log(`      📝 오늘 출석: 없음`);
                }
            });
        }
    }

    // ============================
    // 4. Firestore POLICIES 현재 상태
    // ============================
    console.log('\n\n📌 4. 현재 Firestore POLICIES 설정 확인');
    const studioDoc = await tdb.get();
    const studioData = studioDoc.data();
    const policies = studioData?.POLICIES || {};
    console.log(`   FACE_RECOGNITION_ENABLED: ${policies.FACE_RECOGNITION_ENABLED}`);
    console.log(`   PHOTO_ENABLED: ${policies.PHOTO_ENABLED}`);
    console.log(`   SHOW_CAMERA_PREVIEW: ${policies.SHOW_CAMERA_PREVIEW}`);

    // ============================
    // 5. face_biometrics 컬렉션 현황
    // ============================
    console.log('\n📌 5. 안면 데이터(face_biometrics) 현황');
    const bioSnap = await tdb.collection('face_biometrics').get();
    console.log(`   등록된 안면 데이터: ${bioSnap.size}명`);
    
    if (bioSnap.size > 0) {
        const bioMembers = [];
        bioSnap.forEach(doc => {
            const d = doc.data();
            bioMembers.push({ id: doc.id, name: d.name || '(없음)', updatedAt: d.updatedAt || '(없음)' });
        });
        console.log('   등록 목록:');
        bioMembers.forEach(b => {
            console.log(`      - ${b.name} (${b.id}) | 등록일: ${b.updatedAt}`);
        });
    }

    console.log('\n' + '='.repeat(70));
    console.log('조사 완료.');
    process.exit(0);
}

run().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
