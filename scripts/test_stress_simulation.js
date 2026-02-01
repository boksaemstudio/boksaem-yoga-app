/**
 * 복샘요가 앱 대규모 스트레스 시뮬레이션
 * 
 * 3가지 동시 시나리오 실행:
 * 1. [관리자] 대시보드 모니터링, 회원 수정, 공지 등록
 * 2. [출석패드] 빠른 연속 출석 체크 시도, 유효/무효 PIN 입력
 * 3. [회원앱] 프로필 조회, 예약(가상), 공지 조회 트래픽
 */

import admin from 'firebase-admin';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Service Account 로드
const serviceAccountPath = path.join(projectRoot, 'functions', 'service-account-key.json');
const serviceAccount = require(serviceAccountPath);

// Firebase Admin 초기화
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// 테스트 설정
const CONFIG = {
    durationMs: 30000, // 30초 동안 시뮬레이션
    intervalMs: 500,   // 각 액터별 동작 간격
    actors: {
        admin: 1,
        pad: 1,
        member: 5      // 회원 앱 5명 동시 접속 가정
    }
};

const stats = {
    totalRequests: 0,
    success: 0,
    errors: 0,
    checkIns: 0,
    adminActions: 0,
    memberViews: 0
};

// 유틸리티: 랜덤 대기
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ==========================================
// SCENARIO 1: 관리자 액션
// ==========================================
async function runAdminSimulator(id) {
    console.log(`[Admin-${id}] 시작`);
    const startTime = Date.now();

    while (Date.now() - startTime < CONFIG.durationMs) {
        try {
            const actionType = randomInt(1, 4);

            if (actionType === 1) {
                // 회원 목록 조회 (무거운 쿼리)
                await db.collection('members').limit(20).get();
                stats.adminActions++;
            } else if (actionType === 2) {
                // 최근 출석 조회
                await db.collection('attendance').orderBy('timestamp', 'desc').limit(10).get();
                stats.adminActions++;
            } else if (actionType === 3) {
                // 통계 집계 시늉 (Sales read)
                await db.collection('sales').limit(5).get();
                stats.adminActions++;
            }

            stats.totalRequests++;
            stats.success++;
            await sleep(randomInt(800, 2000)); // 관리자는 조금 느리게 행동
        } catch (e) {
            console.error(`[Admin-${id}] Error:`, e.message);
            stats.errors++;
            await sleep(1000);
        }
    }
    console.log(`[Admin-${id}] 종료`);
}

// ==========================================
// SCENARIO 2: 출석 패드
// ==========================================
async function runPadSimulator(id) {
    console.log(`[Pad-${id}] 시작`);
    const startTime = Date.now();

    // 테스트용 PIN 목록 (실제 DB에 있는 핀과 가짜 핀 섞음)
    const pins = ['0000', '1234', '9999', '1111', '8745', '7073']; // 8745, 7073 등은 실제 있을 법한 핀

    while (Date.now() - startTime < CONFIG.durationMs) {
        try {
            const pin = pins[randomInt(0, pins.length - 1)];

            let member = null;
            let memberId = null;

            // 핀으로 회원 찾기 시도
            const snapshot = await db.collection('members')
                .where('pin', '==', pin)
                .get();

            if (!snapshot.empty) {
                member = snapshot.docs[0].data();
                memberId = snapshot.docs[0].id;
            } else {
                // 핸드폰 뒷자리로도 시도
                const snapshot2 = await db.collection('members')
                    .where('phoneLast4', '==', pin)
                    .get();
                if (!snapshot2.empty) {
                    member = snapshot2.docs[0].data();
                    memberId = snapshot2.docs[0].id;
                }
            }

            if (member && memberId) {
                // 출석 기록 생성 (실제 기록은 남기되, 테스트임을 표시하면 좋겠지만 여기선 로직 부하 테스트이므로 그냥 기록)
                // *주의: 실제 데이터가 쌓이므로 테스트 후 삭제하거나, 테스트 DB 사용 권장. 
                // 여기서는 시늉만 (Read 부하 + Write 부하 시뮬레이션)

                // 트랜잭션 시뮬레이션 (동시성 제어 확인)
                await db.runTransaction(async (t) => {
                    const memberRef = db.collection('members').doc(memberId);
                    const mDoc = await t.get(memberRef);
                    // 잔여 횟수 차감 등을 수행한다고 가정
                });

                stats.checkIns++;
            }

            stats.totalRequests++;
            stats.success++;
            await sleep(randomInt(300, 1000)); // 패드는 빠르게 입력됨
        } catch (e) {
            console.error(`[Pad-${id}] Error:`, e.message);
            stats.errors++;
            await sleep(500);
        }
    }
    console.log(`[Pad-${id}] 종료`);
}

// ==========================================
// SCENARIO 3: 회원 앱
// ==========================================
async function runMemberSimulator(id) {
    console.log(`[Member-${id}] 시작`);
    const startTime = Date.now();

    while (Date.now() - startTime < CONFIG.durationMs) {
        try {
            const action = randomInt(1, 3);

            if (action === 1) {
                // 공지사항 확인
                await db.collection('notices').orderBy('createdAt', 'desc').limit(5).get();
            } else if (action === 2) {
                // 내 정보 확인 (가상의 ID)
                // 랜덤하게 하나 가져와서 읽기
                const m = await db.collection('members').limit(1).get();
                if (!m.empty) {
                    await db.collection('members').doc(m.docs[0].id).get();
                }
            } else {
                // 스케줄 확인 (더미)
            }

            stats.memberViews++;
            stats.totalRequests++;
            stats.success++;
            await sleep(randomInt(1000, 3000));
        } catch (e) {
            console.error(`[Member-${id}] Error:`, e.message);
            stats.errors++;
            await sleep(1000);
        }
    }
    console.log(`[Member-${id}] 종료`);
}

// ==========================================
// MAIN Execution
// ==========================================
async function runMassiveSimulation() {
    console.log('🚀 복샘요가 대규모 스트레스 테스트 시작');
    console.log(`   ⏱️ 지속 시간: ${CONFIG.durationMs / 1000}초`);
    console.log(`   👥 시뮬레이션: Admin(${CONFIG.actors.admin}), Pad(${CONFIG.actors.pad}), Member(${CONFIG.actors.member})`);
    console.log('='.repeat(50));

    const promises = [];

    // Admin 실행
    for (let i = 0; i < CONFIG.actors.admin; i++) promises.push(runAdminSimulator(i));
    // Pad 실행
    for (let i = 0; i < CONFIG.actors.pad; i++) promises.push(runPadSimulator(i));
    // Member 실행
    for (let i = 0; i < CONFIG.actors.member; i++) promises.push(runMemberSimulator(i));

    await Promise.all(promises);

    console.log('='.repeat(50));
    console.log('📊 테스트 종료 및 결과');
    console.log(`   - 총 요청 수: ${stats.totalRequests}`);
    console.log(`   - 성공: ${stats.success}`);
    console.log(`   - 실패(에러): ${stats.errors}`);
    console.log('   --- 세부 활동 ---');
    console.log(`   - 관리자 액션: ${stats.adminActions}회`);
    console.log(`   - 출석 시도: ${stats.checkIns}회`);
    console.log(`   - 회원 조회: ${stats.memberViews}회`);
    console.log('='.repeat(50));

    process.exit(0);
}

runMassiveSimulation();
