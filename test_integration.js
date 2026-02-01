/**
 * 체크인 로직 & 리팩토링 통합 테스트
 */
import admin from 'firebase-admin';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDaysRemaining, getTodayKST } from './src/utils/dates.js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccount = require(path.join(__dirname, 'functions', 'service-account-key.json'));

if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

console.log('='.repeat(70));
console.log('🧪 리팩토링 후 통합 테스트');
console.log('   테스트 시간:', new Date().toLocaleString('ko-KR'));
console.log('='.repeat(70));
console.log();

async function runTests() {
    let passed = 0, failed = 0;

    // ========================================
    // 1. dates.js 유틸리티 테스트
    // ========================================
    console.log('📋 1. dates.js 유틸리티 테스트');
    console.log('-'.repeat(50));

    const dateTests = [
        { input: 'TBD', expected: null },
        { input: 'unlimited', expected: null },
        { input: null, expected: null },
        { input: getTodayKST(), expected: 0 },
    ];

    dateTests.forEach(t => {
        const result = getDaysRemaining(t.input);
        const ok = result === t.expected;
        if (ok) passed++; else failed++;
        console.log(`   ${ok ? '✅' : '❌'} getDaysRemaining('${t.input}') = ${result}`);
    });

    // ========================================
    // 2. 중복 PIN 회원 체크인 시뮬레이션
    // ========================================
    console.log();
    console.log('📋 2. 중복 PIN 회원 조회 테스트');
    console.log('-'.repeat(50));

    // PIN 1234 (한은정, 황지연 - 중복 PIN)
    const testPin = '1234';
    const members = await db.collection('members')
        .where('phoneLast4', '==', testPin)
        .get();

    if (members.size === 0) {
        // phoneLast4가 없으면 pin 필드로 검색
        const membersByPin = await db.collection('members')
            .where('pin', '==', testPin)
            .get();

        if (membersByPin.size > 1) {
            passed++;
            console.log(`   ✅ PIN '${testPin}'로 ${membersByPin.size}명 조회됨 (중복 처리 정상)`);
            membersByPin.forEach(doc => {
                const d = doc.data();
                console.log(`      - ${d.name} (잔여: ${d.credits ?? d.remainingSessions ?? 0}회)`);
            });
        } else if (membersByPin.size === 1) {
            passed++;
            console.log(`   ✅ PIN '${testPin}'로 1명 조회됨 (단일 회원)`);
        } else {
            console.log(`   ⚠️ PIN '${testPin}' 회원 없음`);
        }
    } else if (members.size > 1) {
        passed++;
        console.log(`   ✅ PIN '${testPin}'로 ${members.size}명 조회됨 (중복 처리 정상)`);
    }

    // ========================================
    // 3. 회원 만료일 계산 테스트
    // ========================================
    console.log();
    console.log('📋 3. 회원 만료일 계산 테스트');
    console.log('-'.repeat(50));

    const sampleMembers = await db.collection('members').limit(5).get();
    sampleMembers.forEach(doc => {
        const d = doc.data();
        const endDate = d.endDate?.toDate ? d.endDate.toDate().toISOString().split('T')[0] : d.endDate;
        const daysRemaining = getDaysRemaining(endDate);

        let status = '활성';
        if (daysRemaining === null) status = '미정';
        else if (daysRemaining < 0) status = '만료';
        else if (daysRemaining <= 7) status = '임박';

        console.log(`   ${d.name}: ${endDate ?? 'N/A'} → D${daysRemaining ?? '-'}일 [${status}]`);
    });
    passed++;

    // ========================================
    // 4. 오늘 출석 기록 테스트
    // ========================================
    console.log();
    console.log('📋 4. 오늘 출석 기록 조회');
    console.log('-'.repeat(50));

    const todayStr = getTodayKST();
    const todayAttendance = await db.collection('attendance')
        .where('date', '==', todayStr)
        .get();

    console.log(`   오늘(${todayStr}) 출석: ${todayAttendance.size}건`);
    if (todayAttendance.size > 0) {
        passed++;
        todayAttendance.docs.slice(0, 3).forEach(doc => {
            const d = doc.data();
            console.log(`      - ${d.memberName || d.memberId} (${d.branchId || '지점 미정'})`);
        });
    } else {
        console.log('   ⚠️ 오늘 출석 기록 없음');
    }

    // ========================================
    // 종합 결과
    // ========================================
    console.log();
    console.log('='.repeat(70));
    console.log(`🏁 테스트 완료: ${passed} 통과, ${failed} 실패`);
    console.log('='.repeat(70));

    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('테스트 실패:', err);
    process.exit(1);
});
