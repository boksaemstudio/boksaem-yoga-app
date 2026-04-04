/**
 * 푸시 알림 전체 감사 스크립트
 * 
 * 1. 모든 테넌트의 FCM 토큰 조사 (누가 어디에 등록되어 있는지)
 * 2. 원장(admin) 토큰이 어느 스튜디오에 걸려있는지
 * 3. 데모 스튜디오 출석 → 원장에게 푸시가 가는 경로 추적
 * 4. 일일 리포트(23:00) 동작 여부 확인
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve(__dirname, '../functions/service-account-key.json'));
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'boksaem-yoga'
    });
}

const db = admin.firestore();

async function auditPush() {
    console.log('='.repeat(80));
    console.log('🔔 [푸시 알림 전체 감사] 시작');
    console.log('='.repeat(80));
    
    // 1. 모든 테넌트의 FCM 토큰 조사
    const studiosDocs = await db.collection('studios').listDocuments();
    
    console.log('\n' + '='.repeat(80));
    console.log('📱 [1] 전체 테넌트별 FCM 토큰 현황');
    console.log('='.repeat(80));
    
    const allTokensByStudio = {};
    
    for (const studioRef of studiosDocs) {
        const tokensSnap = await studioRef.collection('fcm_tokens').get();
        const tokens = [];
        
        for (const doc of tokensSnap.docs) {
            const data = doc.data();
            tokens.push({
                tokenId: doc.id.substring(0, 30) + '...',
                role: data.role || 'N/A',
                roles: data.roles || [],
                memberId: data.memberId || 'N/A',
                instructorName: data.instructorName || 'N/A',
                displayName: data.displayName || 'N/A',
                email: data.email || 'N/A',
                language: data.language || 'ko',
                updatedAt: data.updatedAt || 'N/A',
                platform: data.platform || 'N/A'
            });
        }
        
        allTokensByStudio[studioRef.id] = tokens;
        
        console.log(`\n  📦 [${studioRef.id}] FCM 토큰: ${tokens.length}개`);
        
        for (const t of tokens) {
            console.log(`    → role: ${t.role} | roles: ${JSON.stringify(t.roles)} | name: ${t.displayName} | email: ${t.email} | instructor: ${t.instructorName} | memberId: ${t.memberId ? t.memberId.substring(0, 15) : 'N/A'}... | updated: ${t.updatedAt}`);
        }
    }
    
    // 2. 원장(admin) 토큰이 어느 스튜디오에 걸려있는지
    console.log('\n' + '='.repeat(80));
    console.log('👑 [2] admin/superadmin 역할 토큰 분포');
    console.log('='.repeat(80));
    
    for (const [studioId, tokens] of Object.entries(allTokensByStudio)) {
        const adminTokens = tokens.filter(t => 
            t.role === 'admin' || t.role === 'superadmin' || 
            (t.roles && (t.roles.includes('admin') || t.roles.includes('superadmin')))
        );
        
        if (adminTokens.length > 0) {
            console.log(`\n  🚨 [${studioId}] admin 토큰 ${adminTokens.length}개:`);
            for (const t of adminTokens) {
                console.log(`    → role: ${t.role} | roles: ${JSON.stringify(t.roles)} | email: ${t.email} | name: ${t.displayName}`);
            }
        }
    }
    
    // 3. 출석 이벤트 → 푸시 발송 경로 분석
    console.log('\n' + '='.repeat(80));
    console.log('🔍 [3] 출석 → 푸시 경로 분석 (events.js)');
    console.log('='.repeat(80));
    
    console.log(`
    [핵심 문제점 분석]
    
    events.js의 onAttendanceCreated 트리거는:
      document: 'studios/{studioId}/attendance/{attendanceId}'
    
    ※ 이 트리거가 발동하면 내부에서:
    
    [강사 푸시] getAllFCMTokens(null, { role: 'instructor', instructorName }) 호출
      → getAllFCMTokens 내부: tenantDb() ← ⚠️ studioId 미전달!
      → STUDIO_ID 환경변수 = 'boksaem-yoga' 폴백 사용
      → 결과: 어떤 스튜디오에서 출석이 생겨도 '복샘요가'의 강사 토큰을 조회해서 푸시!
    
    [관리자 푸시] getAllFCMTokens(null, { role: 'admin' }) 호출
      → 동일한 이유로 '복샘요가'의 admin 토큰을 조회
      → 데모/쌍문요가에서 출석 → 복샘요가 원장에게 푸시 도착! ← 🚨 이것이 원인!
    
    [회원 푸시] getAllFCMTokens(null, { memberId }) 호출
      → 동일한 이유로 '복샘요가'의 회원 토큰을 조회
    `);
    
    // 4. 일일 리포트 경로 분석
    console.log('\n' + '='.repeat(80));
    console.log('📊 [4] 일일 리포트(23:00) 동작 분석 (scheduled.js)');
    console.log('='.repeat(80));
    
    console.log(`
    [sendDailyAdminReportV2] scheduled.js L70-128
    
    schedule: "0 23 * * *" (매일 23:00 KST)
    
    ※ 내부 로직:
    1. tenantDb() ← 환경변수 폴백 → boksaem-yoga 고정
       → OK (현재 복샘요가만 대상)
    
    2. getAllFCMTokens(null, { role: 'admin' }) ← ⚠️ tenantDb() 미격리!
       → 복샘요가의 admin 토큰을 조회하지만...
       → getAllFCMTokens 내부의 tenantDb()도 환경변수 폴백
       → 복샘요가 admin 토큰은 제대로 조회될 수 있음
    
    3. ⚠️ 그런데 L106에서:
       const { tokens } = await getAllFCMTokens(null, { role: 'admin' });
       → 이 함수는 common.js L90 getAllFCMTokens에 정의
       → getAllFCMTokens 내부: tenantDb() → boksaem-yoga
       → boksaem-yoga의 fcm_tokens에서 role=admin 조회
    
    4. 결과적으로 토큰이 있으면 푸시가 갈 수 있음
       → 문제는 토큰이 실제 등록되어 있는지!
    `);
    
    // 5. 복샘요가 admin 토큰 상세 확인
    console.log('\n' + '='.repeat(80));
    console.log('🔑 [5] 복샘요가 admin 토큰 상세');
    console.log('='.repeat(80));
    
    const boksaemTokens = await db.collection('studios/boksaem-yoga/fcm_tokens').get();
    const adminTokens = [];
    
    for (const doc of boksaemTokens.docs) {
        const data = doc.data();
        if (data.role === 'admin' || data.role === 'superadmin' || 
            (data.roles && (data.roles.includes('admin') || data.roles.includes('superadmin')))) {
            adminTokens.push({ token: doc.id, ...data });
        }
    }
    
    console.log(`\n  복샘요가 admin 토큰: ${adminTokens.length}개`);
    for (const t of adminTokens) {
        console.log(`    token: ${t.token.substring(0, 40)}...`);
        console.log(`    role: ${t.role} | roles: ${JSON.stringify(t.roles)}`);
        console.log(`    email: ${t.email}`);
        console.log(`    displayName: ${t.displayName}`);
        console.log(`    updatedAt: ${t.updatedAt}`);
        console.log(`    platform: ${t.platform}`);
        console.log('');
    }
    
    // 6. 데모 스튜디오의 출석 트리거 → 복샘요가 원장 푸시 도달 증명
    console.log('\n' + '='.repeat(80));
    console.log('🚨 [6] 데모 스튜디오 출석 → 복샘요가 원장 푸시 경로 증명');
    console.log('='.repeat(80));
    
    // demo-yoga 출석 중 최근 것 확인
    const demoAttSnap = await db.collection('studios/demo-yoga/attendance')
        .limit(5)
        .get();
    
    console.log(`\n  데모요가 최근 출석 ${demoAttSnap.size}건:`);
    for (const doc of demoAttSnap.docs) {
        const data = doc.data();
        console.log(`    [${data.date}] ${data.memberName} | ${data.className} | ${data.instructor}`);
    }
    
    console.log(`
    🔴 [결론] 데모요가에서 출석이 생기면:
    
    1. Firestore 트리거: studios/demo-yoga/attendance/{id} → onAttendanceCreated 발동
    2. events.js L20: tdb = tenantDb(event.params.studioId) → demo-yoga ✅ (수정 완료)
    3. events.js L65: getAllFCMTokens(null, { role: 'instructor', instructorName })
       → 🚨 getAllFCMTokens 내부: tenantDb() → boksaem-yoga (환경변수 폴백!)
       → 복샘요가의 강사 토큰을 조회!
    4. events.js L122: getAllFCMTokens(null, { role: 'admin' })
       → 🚨 동일하게 복샘요가의 admin 토큰을 조회!
       → 복샘요가 원장에게 데모요가 출석 푸시가 도착! ← 원장님이 보고하신 현상 그것!
    5. events.js L188: getAllFCMTokens(null, { memberId })
       → 🚨 동일하게 복샘요가 회원의 토큰을 조회!
    `);
    
    // 7. getStudioName / getStudioLogoUrl 미격리
    console.log('\n' + '='.repeat(80));
    console.log('🏷️ [7] getStudioName / getStudioLogoUrl 미격리');
    console.log('='.repeat(80));
    
    console.log(`
    events.js L74: getStudioName() ← studioId 미전달 → 환경변수 폴백 → "복샘요가"
    events.js L75: getStudioLogoUrl() ← 동일
    
    → 데모요가에서 출석 → 푸시 타이틀에 "복샘요가" 표시!
    → 원장은 이것을 보고 "복샘요가 출석 알림"으로 인식
    → 하지만 실제로는 데모요가의 출석 푸시
    `);

    console.log('\n' + '='.repeat(80));
    console.log('✅ 감사 완료');
    console.log('='.repeat(80));
}

auditPush().then(() => process.exit(0)).catch(e => {
    console.error('감사 실행 실패:', e);
    process.exit(1);
});
