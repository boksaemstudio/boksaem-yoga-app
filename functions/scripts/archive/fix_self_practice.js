/**
 * 자율수련으로 잘못 기록된 오늘 출석 데이터를 올바른 수업으로 수정
 * 
 * 로직:
 * 1. 오늘 날짜의 attendance에서 className === '자율수련'인 것을 조회
 * 2. 해당 출석의 timestamp와 branchId를 기준으로 daily_classes에서 매칭
 * 3. 매칭된 수업이 있으면 className과 instructor를 업데이트
 * 
 * 사용법: node scripts/fix_self_practice.js [--dry-run]
 */

const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    const serviceAccount = require('../service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixSelfPracticeRecords(dryRun = false) {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    console.log(`\n📅 날짜: ${today}`);
    console.log(`🔧 모드: ${dryRun ? 'DRY-RUN (미리보기)' : '실제 수정'}\n`);

    // 1. 오늘 자율수련 출석 조회
    const snap = await db.collection('attendance')
        .where('date', '==', today)
        .where('className', '==', '자율수련')
        .get();

    if (snap.empty) {
        console.log('✅ 오늘 자율수련으로 기록된 출석이 없습니다.');
        return;
    }

    console.log(`📋 자율수련 출석 ${snap.size}건 발견\n`);

    // 2. daily_classes 캐시
    const scheduleCache = {};

    let fixed = 0;
    let skipped = 0;

    for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const { timestamp, branchId, memberName } = data;

        if (!timestamp || !branchId) {
            console.log(`  ⏭ ${memberName || '?'}: timestamp/branchId 없음 - 건너뜀`);
            skipped++;
            continue;
        }

        // 3. 스케줄 조회
        const scheduleKey = `${branchId}_${today}`;
        if (!scheduleCache[scheduleKey]) {
            const schedDoc = await db.collection('daily_classes').doc(scheduleKey).get();
            scheduleCache[scheduleKey] = schedDoc.exists ? (schedDoc.data().classes || []) : [];
        }

        const classes = scheduleCache[scheduleKey].filter(c => c.status !== 'cancelled');
        
        if (classes.length === 0) {
            console.log(`  ⏭ ${memberName || '?'}: ${branchId} 스케줄 없음 - 건너뜀`);
            skipped++;
            continue;
        }

        // 4. 시간 매칭 (확장된 윈도우: 수업 시작 30분 전 ~ 종료 30분 후)
        const attendTime = new Date(timestamp);
        const attendMins = attendTime.getHours() * 60 + attendTime.getMinutes();

        let matchedClass = null;
        let bestDistance = Infinity;

        for (const cls of classes) {
            if (!cls.time) continue;
            const [h, m] = cls.time.split(':').map(Number);
            const startMins = h * 60 + m;
            const duration = cls.duration || 60;
            const endMins = startMins + duration;

            // 수업 시작 30분 전 ~ 종료 30분 후
            if (attendMins >= startMins - 30 && attendMins <= endMins + 30) {
                // 가장 가까운 수업 선택
                const distance = Math.abs(attendMins - startMins);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    matchedClass = cls;
                }
            }
        }

        if (!matchedClass) {
            console.log(`  ⏭ ${memberName || '?'} (${attendTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}): 매칭 수업 없음 - 건너뜀`);
            skipped++;
            continue;
        }

        const newClassName = matchedClass.title || matchedClass.name || '수업';
        const newInstructor = matchedClass.instructor || '강사님';
        const timeStr = attendTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

        console.log(`  ✏️  ${memberName || '?'} (${timeStr}): 자율수련 → ${newClassName} (${newInstructor} 강사님) [${matchedClass.time}]`);

        if (!dryRun) {
            await db.collection('attendance').doc(docSnap.id).update({
                className: newClassName,
                instructor: newInstructor
            });
            fixed++;
        } else {
            fixed++;
        }
    }

    console.log(`\n📊 결과: ${fixed}건 수정${dryRun ? ' 예정' : ' 완료'}, ${skipped}건 건너뜀`);
}

// 실행
const isDryRun = process.argv.includes('--dry-run');
fixSelfPracticeRecords(isDryRun)
    .then(() => {
        console.log('\n✅ 완료');
        process.exit(0);
    })
    .catch(e => {
        console.error('❌ 오류:', e);
        process.exit(1);
    });
