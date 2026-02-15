const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin 초기화
const serviceAccount = require(path.join(__dirname, 'functions', 'service-account-key.json'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function investigate() {
    const today = '2026-02-15';
    const memberNames = ['김기연', '유성화'];
    const branches = ['gwangheungchang', 'mapo'];
    
    console.log('=== 자율수련 원인 조사 ===');
    console.log(`조사 날짜: ${today}\n`);

    // 1. 회원 출석 기록 조회
    for (const name of memberNames) {
        console.log(`\n--- ${name} 회원 출석 조사 ---`);
        const membersSnap = await db.collection('members').where('name', '==', name).get();
        
        if (membersSnap.empty) {
            console.log(`  ❌ '${name}' 회원을 찾을 수 없습니다.`);
            continue;
        }
        
        for (const memberDoc of membersSnap.docs) {
            const memberId = memberDoc.id;
            const memberData = memberDoc.data();
            console.log(`  회원 ID: ${memberId}`);
            console.log(`  지점: ${memberData.branch || '미지정'}`);
            console.log(`  전화번호 끝 4자리: ${memberData.phoneLast4 || 'N/A'}`);
            
            // 오늘 출석 기록 조회
            const aSnap = await db.collection('attendance')
                .where('memberId', '==', memberId)
                .where('date', '==', today)
                .get();
            
            if (aSnap.empty) {
                console.log(`  ⚠️ ${today} 날짜의 출석 기록이 없습니다.`);
            } else {
                console.log(`  📋 ${today} 출석 기록 (${aSnap.size}건):`);
                aSnap.docs.forEach(d => {
                    const data = d.data();
                    const ts = data.timestamp ? new Date(data.timestamp) : null;
                    const timeStr = ts ? ts.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }) : 'N/A';
                    console.log(`    - 시간: ${timeStr} | 수업: ${data.className} | 강사: ${data.instructor} | 지점: ${data.branchId} | 타입: ${data.type || 'N/A'}`);
                    console.log(`      timestamp: ${data.timestamp}`);
                    console.log(`      docId: ${d.id}`);
                });
            }
            
            // 최근 출석 기록 (최대 5건)
            try {
                const recentSnap = await db.collection('attendance')
                    .where('memberId', '==', memberId)
                    .orderBy('timestamp', 'desc')
                    .limit(5)
                    .get();
                console.log(`  📊 최근 출석 기록 (최대 5건):`);
                recentSnap.docs.forEach(d => {
                    const data = d.data();
                    console.log(`    - ${data.date} | ${data.className} | ${data.instructor} | ${data.branchId}`);
                });
            } catch (e) {
                console.log(`  ⚠️ 최근 기록 조회 에러: ${e.message}`);
            }
        }
    }

    // 2. 오늘 날짜 스케줄 데이터 확인
    console.log('\n\n=== 오늘 스케줄 데이터 (daily_classes) ===');
    for (const branch of branches) {
        const cacheKey = `${branch}_${today}`;
        console.log(`\n--- ${branch} (${cacheKey}) ---`);
        
        const docSnap = await db.collection('daily_classes').doc(cacheKey).get();
        
        if (!docSnap.exists) {
            console.log(`  ❌ 스케줄 문서가 존재하지 않습니다!`);
            console.log(`  → 이것이 자율수련의 원인일 수 있습니다!`);
        } else {
            const data = docSnap.data();
            const classes = data.classes || [];
            console.log(`  ✅ ${classes.length}개 수업 등록됨`);
            console.log(`  📅 업데이트 시간: ${data.updatedAt || data.timestamp || 'N/A'}`);
            classes.forEach(cls => {
                const duration = cls.duration || 60;
                const [h, m] = (cls.time || '00:00').split(':').map(Number);
                const startMin = h * 60 + m;
                const endMin = startMin + duration;
                const endH = Math.floor(endMin / 60);
                const endM = endMin % 60;
                console.log(`    ${cls.time}~${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')} | ${cls.title || cls.className || '?'} | ${cls.instructor || '?'} | 상태: ${cls.status || 'active'}`);
            });
        }
    }

    // 3. 오늘 전체 '자율수련' 기록 조회
    console.log('\n\n=== 오늘 전체 자율수련 기록 ===');
    try {
        const selfSnap = await db.collection('attendance')
            .where('date', '==', today)
            .where('className', '==', '자율수련')
            .get();
        console.log(`총 ${selfSnap.size}건의 자율수련 기록:`);
        selfSnap.docs.forEach(d => {
            const data = d.data();
            const ts = data.timestamp ? new Date(data.timestamp) : null;
            const timeStr = ts ? ts.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }) : 'N/A';
            console.log(`  - ${data.memberName || 'N/A'} | ${timeStr} | ${data.branchId} | ${data.instructor} | type: ${data.type || 'N/A'}`);
        });
    } catch (e) {
        console.log(`자율수련 레코드 조회 에러: ${e.message}`);
    }

    console.log('\n=== 조사 완료 ===');
    process.exit(0);
}

investigate().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
