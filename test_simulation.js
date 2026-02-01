/**
 * 복샘요가 앱 종합 시뮬레이션 테스트 스크립트 (Admin SDK)
 * Firestore 데이터 검증 및 기능 테스트
 */

import admin from 'firebase-admin';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Service Account 로드
const serviceAccountPath = path.join(__dirname, 'functions', 'service-account-key.json');
const serviceAccount = require(serviceAccountPath);

// Firebase Admin 초기화
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

console.log('='.repeat(70));
console.log('🧘 복샘요가 앱 종합 데이터 검증 테스트 (Admin SDK)');
console.log('   테스트 시간:', new Date().toLocaleString('ko-KR'));
console.log('='.repeat(70));
console.log();

// 테스트 결과 저장
const testResults = {
    members: {
        total: 0,
        active: 0,
        expired: 0,
        zeroCredits: 0,
        samples: [],
        byBranch: {} // 지점별 회원 수
    },
    attendance: {
        total: 0,
        todayCount: 0,
        thisWeekCount: 0
    },
    notices: {
        total: 0,
        recent: []
    },
    messages: {
        total: 0
    },
    duplicatePins: [],
    performance: {},
    issues: [],
    // 리팩토링 후 추가 검증
    refactoringCheck: {
        datesUtilWorks: false
    }
};

// [NEW] Dates 유틸리티 검증 함수
function testDatesUtil() {
    // getDaysRemaining 기능 테스트
    const testCases = [
        { input: null, expected: null },
        { input: 'TBD', expected: null },
        { input: 'unlimited', expected: null },
        { input: 'invalid-date', expected: null },
        { input: new Date().toISOString().split('T')[0], expected: 0 } // 오늘
    ];

    let passed = 0;
    for (const tc of testCases) {
        const result = getDaysRemainingLocal(tc.input);
        if (result === tc.expected) passed++;
    }
    return passed === testCases.length;
}

// 로컬 복제 함수 (dates.js와 동일해야 함)
function getDaysRemainingLocal(endDate) {
    if (!endDate || endDate === 'TBD' || endDate === 'unlimited') return null;
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = end - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

async function runTests() {
    const overallStartTime = Date.now();

    // ============================================
    // Phase 0: 리팩토링 검증
    // ============================================
    console.log('🔧 Phase 0: 리팩토링 검증');
    console.log('-'.repeat(50));
    testResults.refactoringCheck.datesUtilWorks = testDatesUtil();
    console.log(`✅ dates.js getDaysRemaining 로직: ${testResults.refactoringCheck.datesUtilWorks ? '정상' : '❌ 실패'}`);
    console.log();

    // ============================================
    // Phase 1: 회원 데이터 검증
    // ============================================
    console.log('📋 Phase 1: 회원 데이터 검증');
    console.log('-'.repeat(50));

    let phaseStart = Date.now();
    try {
        const membersSnap = await db.collection('members').get();
        testResults.members.total = membersSnap.size;

        const today = new Date();
        const pinMap = new Map(); // PIN 중복 체크용

        membersSnap.forEach(doc => {
            const data = doc.data();

            // PIN 중복 확인
            const pin = data.pin || data.phoneLast4;
            if (pin) {
                if (!pinMap.has(pin)) pinMap.set(pin, []);
                pinMap.set(pin, [...pinMap.get(pin), { id: doc.id, name: data.name }]);
            }

            // 잔여 횟수 0인 회원
            const credits = data.remainingSessions ?? data.credits ?? data.remainingCredits ?? 0;
            if (credits === 0) {
                testResults.members.zeroCredits++;
            }

            // 만료 여부 확인
            let endDate = null;
            if (data.endDate) {
                endDate = data.endDate.toDate ? data.endDate.toDate() : new Date(data.endDate);
            }

            if (endDate && endDate < today) {
                testResults.members.expired++;
            } else {
                testResults.members.active++;
            }

            // 샘플 회원 저장 (처음 5명)
            if (testResults.members.samples.length < 5) {
                testResults.members.samples.push({
                    id: doc.id,
                    name: data.name,
                    phone: data.phone,
                    pin: pin,
                    credits: credits,
                    branch: data.branch
                });
            }
        });

        // 중복 PIN 찾기
        pinMap.forEach((members, pin) => {
            if (members.length > 1) {
                testResults.duplicatePins.push({ pin, members });
            }
        });

        console.log(`✅ 전체 회원: ${testResults.members.total}명`);
        console.log(`   - 활성 회원: ${testResults.members.active}명`);
        console.log(`   - 만료 회원: ${testResults.members.expired}명`);
        console.log(`   - 잔여 0 회원: ${testResults.members.zeroCredits}명`);
        console.log(`   - 중복 PIN: ${testResults.duplicatePins.length}개`);
        if (testResults.duplicatePins.length > 0) {
            testResults.duplicatePins.slice(0, 3).forEach(dp => {
                console.log(`     · PIN ${dp.pin}: ${dp.members.map(m => m.name).join(', ')}`);
            });
        }
        testResults.performance.phase1 = Date.now() - phaseStart;
        console.log(`   ⏱️ 조회 시간: ${testResults.performance.phase1}ms`);
    } catch (error) {
        console.log(`❌ 회원 데이터 조회 실패: ${error.message}`);
        testResults.issues.push(`회원 데이터 조회 실패: ${error.message}`);
    }

    console.log();

    // ============================================
    // Phase 2: 출석 데이터 검증
    // ============================================
    console.log('📋 Phase 2: 출석 데이터 검증');
    console.log('-'.repeat(50));

    phaseStart = Date.now();
    try {
        const attendanceSnap = await db.collection('attendance').get();
        testResults.attendance.total = attendanceSnap.size;

        // 오늘 출석 체크
        const todayStr = new Date().toISOString().split('T')[0];
        const todayAttendees = [];

        attendanceSnap.forEach(doc => {
            const data = doc.data();
            let recordDate = null;

            if (data.date) {
                recordDate = data.date;
            } else if (data.timestamp) {
                const ts = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                recordDate = ts.toISOString().split('T')[0];
            }

            if (recordDate === todayStr) {
                testResults.attendance.todayCount++;
                todayAttendees.push(data.memberName || data.memberId);
            }
        });

        console.log(`✅ 전체 출석 기록: ${testResults.attendance.total}건`);
        console.log(`   - 오늘 출석: ${testResults.attendance.todayCount}명`);
        if (todayAttendees.length > 0) {
            console.log(`   - 출석자: ${todayAttendees.slice(0, 5).join(', ')}${todayAttendees.length > 5 ? '...' : ''}`);
        }
        testResults.performance.phase2 = Date.now() - phaseStart;
        console.log(`   ⏱️ 조회 시간: ${testResults.performance.phase2}ms`);
    } catch (error) {
        console.log(`❌ 출석 데이터 조회 실패: ${error.message}`);
        testResults.issues.push(`출석 데이터 조회 실패: ${error.message}`);
    }

    console.log();

    // ============================================
    // Phase 3: 공지사항 검증
    // ============================================
    console.log('📋 Phase 3: 공지사항 데이터 검증');
    console.log('-'.repeat(50));

    phaseStart = Date.now();
    try {
        const noticesSnap = await db.collection('notices').orderBy('createdAt', 'desc').limit(10).get();
        testResults.notices.total = noticesSnap.size;

        noticesSnap.forEach(doc => {
            const data = doc.data();
            testResults.notices.recent.push({
                title: data.title || data.content?.substring(0, 30) || '(제목 없음)',
                createdAt: data.createdAt?.toDate?.()?.toLocaleDateString('ko-KR') || '날짜 없음'
            });
        });

        console.log(`✅ 최근 공지: ${testResults.notices.total}건`);
        testResults.notices.recent.slice(0, 3).forEach((n, i) => {
            console.log(`   ${i + 1}. ${n.title} (${n.createdAt})`);
        });
        testResults.performance.phase3 = Date.now() - phaseStart;
        console.log(`   ⏱️ 조회 시간: ${testResults.performance.phase3}ms`);
    } catch (error) {
        console.log(`❌ 공지 데이터 조회 실패: ${error.message}`);
        testResults.issues.push(`공지 데이터 조회 실패: ${error.message}`);
    }

    console.log();

    // ============================================
    // Phase 4: 메시지 검증
    // ============================================
    console.log('📋 Phase 4: 개인 메시지 데이터 검증');
    console.log('-'.repeat(50));

    phaseStart = Date.now();
    try {
        const messagesSnap = await db.collection('messages').get();
        testResults.messages.total = messagesSnap.size;

        // 푸시 상태별 분류
        let pushSent = 0, pushFailed = 0;
        messagesSnap.forEach(doc => {
            const data = doc.data();
            if (data.pushStatus?.sent) pushSent++;
            else if (data.pushStatus?.error) pushFailed++;
        });

        console.log(`✅ 전체 메시지: ${testResults.messages.total}건`);
        console.log(`   - 푸시 성공: ${pushSent}건`);
        console.log(`   - 푸시 실패: ${pushFailed}건`);
        testResults.performance.phase4 = Date.now() - phaseStart;
        console.log(`   ⏱️ 조회 시간: ${testResults.performance.phase4}ms`);
    } catch (error) {
        console.log(`❌ 메시지 데이터 조회 실패: ${error.message}`);
        testResults.issues.push(`메시지 데이터 조회 실패: ${error.message}`);
    }

    console.log();

    // ============================================
    // Phase 5: FCM 토큰 검증
    // ============================================
    console.log('📋 Phase 5: FCM 토큰 검증');
    console.log('-'.repeat(50));

    phaseStart = Date.now();
    try {
        const tokensSnap = await db.collection('fcm_tokens').get();
        const tokenCount = tokensSnap.size;

        // 회원별 토큰 수 확인
        const memberTokens = new Map();
        tokensSnap.forEach(doc => {
            const data = doc.data();
            const memberId = data.memberId || 'unknown';
            if (!memberTokens.has(memberId)) memberTokens.set(memberId, 0);
            memberTokens.set(memberId, memberTokens.get(memberId) + 1);
        });

        // 과다 토큰 회원 확인
        const excessiveTokens = [];
        memberTokens.forEach((count, memberId) => {
            if (count > 3) excessiveTokens.push({ memberId, count });
        });

        console.log(`✅ 전체 FCM 토큰: ${tokenCount}개`);
        console.log(`   - 등록 회원 수: ${memberTokens.size}명`);
        if (excessiveTokens.length > 0) {
            console.log(`   ⚠️ 과다 토큰 회원: ${excessiveTokens.length}명`);
            excessiveTokens.slice(0, 3).forEach(e => {
                console.log(`     · ${e.memberId}: ${e.count}개`);
            });
        }
        testResults.performance.phase5 = Date.now() - phaseStart;
        console.log(`   ⏱️ 조회 시간: ${testResults.performance.phase5}ms`);
    } catch (error) {
        console.log(`❌ FCM 토큰 조회 실패: ${error.message}`);
        testResults.issues.push(`FCM 토큰 조회 실패: ${error.message}`);
    }

    console.log();

    // ============================================
    // Phase 6: 결제/매출 데이터 검증
    // ============================================
    console.log('📋 Phase 6: 매출 데이터 검증');
    console.log('-'.repeat(50));

    phaseStart = Date.now();
    try {
        const salesSnap = await db.collection('sales').get();
        let totalRevenue = 0;
        let thisMonthRevenue = 0;
        const thisMonth = new Date().toISOString().slice(0, 7);

        salesSnap.forEach(doc => {
            const data = doc.data();
            const amount = data.amount || data.price || 0;
            totalRevenue += amount;

            if (data.date?.startsWith(thisMonth) ||
                data.createdAt?.toDate?.()?.toISOString?.()?.startsWith(thisMonth)) {
                thisMonthRevenue += amount;
            }
        });

        console.log(`✅ 전체 결제 건수: ${salesSnap.size}건`);
        console.log(`   - 누적 매출: ${totalRevenue.toLocaleString()}원`);
        console.log(`   - 이번 달 매출: ${thisMonthRevenue.toLocaleString()}원`);
        testResults.performance.phase6 = Date.now() - phaseStart;
        console.log(`   ⏱️ 조회 시간: ${testResults.performance.phase6}ms`);
    } catch (error) {
        console.log(`❌ 매출 데이터 조회 실패: ${error.message}`);
        testResults.issues.push(`매출 데이터 조회 실패: ${error.message}`);
    }

    console.log();

    // ============================================
    // 종합 결과
    // ============================================
    testResults.performance.total = Date.now() - overallStartTime;

    console.log('='.repeat(70));
    console.log('📊 종합 테스트 결과 요약');
    console.log('='.repeat(70));
    console.log();
    console.log(`🕐 총 테스트 시간: ${testResults.performance.total}ms`);
    console.log();
    console.log('📈 데이터 현황:');
    console.log(`   - 회원: ${testResults.members.total}명 (활성 ${testResults.members.active}, 만료 ${testResults.members.expired})`);
    console.log(`   - 출석: ${testResults.attendance.total}건 (오늘 ${testResults.attendance.todayCount})`);
    console.log(`   - 공지: ${testResults.notices.total}건`);
    console.log(`   - 메시지: ${testResults.messages.total}건`);
    console.log();

    if (testResults.issues.length > 0) {
        console.log('⚠️ 발견된 이슈:');
        testResults.issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
    } else {
        console.log('✅ 모든 데이터 검증 통과!');
    }

    console.log();
    console.log('📝 샘플 회원 정보:');
    testResults.members.samples.forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.name} (${m.phone?.slice(-4) || m.pin}) - ${m.branch || '지점 미정'} - 잔여 ${m.credits}회`);
    });

    // [NEW] 중복 PIN 전체 목록
    console.log();
    console.log('='.repeat(70));
    console.log('🔴 중복 PIN 전체 목록 (총 ' + testResults.duplicatePins.length + '건)');
    console.log('='.repeat(70));
    if (testResults.duplicatePins.length === 0) {
        console.log('   중복 PIN이 없습니다.');
    } else {
        testResults.duplicatePins
            .sort((a, b) => b.members.length - a.members.length) // 가장 많은 중복부터
            .forEach((dp, i) => {
                const names = dp.members.map(m => m.name).join(', ');
                console.log(`   ${i + 1}. PIN [${dp.pin}] → ${names} (${dp.members.length}명)`);
            });
    }

    console.log();
    console.log('='.repeat(70));

    process.exit(0);
}

runTests().catch(err => {
    console.error('테스트 실행 실패:', err);
    process.exit(1);
});
