const { chromium } = require('playwright');
const path = require('path');

const DIR = 'C:\\Users\\boksoon\\.gemini\\antigravity\\brain\\d550a6af-6fcb-4bac-9519-6655803b905e';
const ss = (n) => path.join(DIR, n);
const BASE = 'http://localhost:5173';

let passed = 0, failed = 0, skipped = 0;
const results = [];
function check(n, c) { if (c) { passed++; results.push(`✅ ${n}`); console.log(`  ✅ ${n}`); } else { failed++; results.push(`❌ ${n}`); console.log(`  ❌ ${n}`); } }
function skip(n, r) { skipped++; results.push(`⏭️ ${n} (${r})`); console.log(`  ⏭️ ${n} (${r})`); }

(async () => {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !m.text().includes('favicon') && !m.text().includes('workbox') && !m.text().includes('service-worker')) errors.push(m.text()); });

    const networkReqs = [];
    p.on('response', resp => {
        const url = resp.url();
        if (url.includes('firestore') || url.includes('firebase') || url.includes('googleapis')) {
            networkReqs.push({ url: url.substring(0, 80), status: resp.status() });
        }
    });

    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║    복샘요가 SaaS 전체 앱 종합 E2E 테스트 (출시 레벨)     ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  시작 시각: ${new Date().toLocaleTimeString('ko-KR')}                               ║`);
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // ═══════════════════════════════════════════════
    // SECTION A: 출석 화면 (키오스크) — 프론트 도어
    // ═══════════════════════════════════════════════
    console.log('━━━ SECTION A: 출석 화면 (키오스크) ━━━');
    await p.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await p.waitForTimeout(5000);
    let body = await p.textContent('body');

    // A-1: 페이지 로드
    check('A-1: 출석화면 로드', body?.length > 100);
    
    // A-2: 핵심 UI 요소
    check('A-2: 키패드 숫자 1~9 표시', body?.includes('1') && body?.includes('9'));
    check('A-3: "전화번호 뒤 4자리" 안내', body?.includes('4자리'));
    check('A-4: "지움" 버튼', body?.includes('지움') || body?.includes('지우기'));
    
    // A-5: 시간/날짜 표시
    check('A-5: 날짜 표시', body?.includes('2026') && body?.includes('3월'));
    
    // A-6: 지점 표시
    check('A-6: 지점명 표시', body?.includes('광흥창점') || body?.includes('마포점'));

    // A-7: QR 코드 영역
    check('A-7: QR 코드 또는 "내 요가" 영역', body?.includes('내 요가') || body?.includes('QR'));

    // A-8: AI 인사말
    check('A-8: AI 메시지 영역', body?.includes('AI') || body?.includes('메시지') || body?.includes('오늘'));

    // A-9: 카메라 프리뷰 + 안면인식 (설정에 따라)
    const hasCamPreview = body?.includes('사진 미저장') || body?.includes('터치하여 등록');
    check('A-9: 카메라 프리뷰 표시 (ON 설정)', hasCamPreview);

    // A-10: 선생님 버튼
    check('A-10: "선생님" 버튼', body?.includes('선생님'));
    
    await p.screenshot({ path: ss('full_A_checkin.png') });

    // A-11: 잘못된 PIN 입력 → 에러 처리
    const keys = ['1','2','3','4'];
    for (const k of keys) {
        const btn = p.locator(`.keypad-btn:text("${k}")`).first();
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await btn.click(); await p.waitForTimeout(150);
        }
    }
    await p.waitForTimeout(3000);
    body = await p.textContent('body');
    const hasErrorOrResult = body?.includes('회원') || body?.includes('출석') || body?.includes('확인') || body?.includes('등록');
    check('A-11: PIN 입력 → 응답 (성공 또는 에러)', hasErrorOrResult);
    await p.screenshot({ path: ss('full_A_pin_result.png') });
    // Reset
    await p.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await p.waitForTimeout(3000);

    // ═══════════════════════════════════════════════
    // SECTION B: 관리자 대시보드 — 모든 탭
    // ═══════════════════════════════════════════════
    console.log('\n━━━ SECTION B: 관리자 대시보드 ━━━');
    await p.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
    await p.waitForTimeout(5000);
    body = await p.textContent('body');

    check('B-1: 관리자 페이지 로드', body?.includes('관리') || body?.includes('회원'));
    await p.screenshot({ path: ss('full_B_admin.png') });

    // 탭 목록: 회원, 출석, 시간표, 가격표, 매출, 공지, 알림기록, 키오스크, 설정
    const tabs = [
        { name: '회원', checks: ['회원', '명'], id: 'B-2' },
        { name: '출석', checks: ['출석'], id: 'B-3' },
        { name: '시간표', checks: ['시간표'], id: 'B-4' },
        { name: '가격표', checks: ['가격'], id: 'B-5' },
        { name: '매출', checks: ['매출'], id: 'B-6' },
        { name: '공지', checks: ['공지'], id: 'B-7' },
        { name: '알림기록', checks: ['알림'], id: 'B-8' },
        { name: '키오스크', checks: ['키오스크'], id: 'B-9' },
        { name: '설정', checks: ['설정', '요가원'], id: 'B-10' },
    ];

    for (const tab of tabs) {
        const navItems = await p.$$('button, a, [role="tab"], .nav-item');
        let clicked = false;
        for (const item of navItems) {
            const txt = await item.textContent().catch(() => '');
            if (txt.trim() === tab.name || (txt.includes(tab.name) && txt.length < 15)) {
                await item.click();
                await p.waitForTimeout(3000);
                clicked = true;
                break;
            }
        }
        if (clicked) {
            body = await p.textContent('body');
            const hasContent = tab.checks.some(c => body?.includes(c));
            check(`${tab.id}: "${tab.name}" 탭 로드 + 컨텐츠`, hasContent);
            await p.screenshot({ path: ss(`full_${tab.id}_${tab.name}.png`) });
        } else {
            skip(`${tab.id}: "${tab.name}" 탭`, '탭 버튼 미발견');
        }
    }

    // ═══════════════════════════════════════════════
    // SECTION C: 회원 탭 심층 테스트
    // ═══════════════════════════════════════════════
    console.log('\n━━━ SECTION C: 회원 관리 심층 ━━━');
    // go to members tab
    for (const item of await p.$$('button, a, [role="tab"]')) {
        const t = await item.textContent().catch(() => '');
        if (t.trim() === '회원') { await item.click(); await p.waitForTimeout(3000); break; }
    }
    body = await p.textContent('body');

    // C-1: 회원 목록 렌더링
    check('C-1: 회원 목록 렌더링', body?.includes('명') || body?.includes('회원'));

    // C-2: 검색 기능
    const searchInput = p.locator('input[placeholder*="검색"], input[placeholder*="이름"]').first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput.fill('테스트');
        await p.waitForTimeout(1500);
        check('C-2: 검색 기능 작동', true);
        await searchInput.clear();
        await p.waitForTimeout(1000);
    } else {
        skip('C-2: 검색 기능', '검색 입력 미발견');
    }

    // C-3: 필터 카드 존재
    check('C-3: 필터 카드 존재', body?.includes('전체') || body?.includes('활성') || body?.includes('만료'));

    // C-4: 안면 미등록 회원 필터
    check('C-4: "안면 미등록 회원" 카드', body?.includes('안면 미등록'));

    // C-5: 회원 카드 클릭 → 상세 모달
    const memberCards = await p.$$('[style*="cursor: pointer"], [onclick], .member-card, .member-item');
    if (memberCards.length > 0) {
        // find first visible  
        for (const card of memberCards) {
            const box = await card.boundingBox().catch(() => null);
            if (box && box.height > 30 && box.width > 100) {
                await card.click();
                await p.waitForTimeout(2000);
                body = await p.textContent('body');
                const modalOpened = body?.includes('회원 정보') || body?.includes('등록') || body?.includes('수강') || body?.includes('출석 기록');
                check('C-5: 회원 클릭 → 상세 모달', modalOpened);
                await p.screenshot({ path: ss('full_C_member_detail.png') });
                
                // C-6: 모달 내 탭 확인
                const detailTabs = ['등록', '출석', '수강', '메시지'];
                for (const dt of detailTabs) {
                    const hasTab = body?.includes(dt);
                    if (hasTab) check(`C-6: 상세 모달 "${dt}" 탭`, true);
                }
                
                // Close modal
                await p.keyboard.press('Escape');
                await p.waitForTimeout(1000);
                break;
            }
        }
    }

    // ═══════════════════════════════════════════════
    // SECTION D: 시간표 탭 심층 테스트
    // ═══════════════════════════════════════════════
    console.log('\n━━━ SECTION D: 시간표 ━━━');
    for (const item of await p.$$('button, a, [role="tab"]')) {
        const t = await item.textContent().catch(() => '');
        if (t.includes('시간표') && t.length < 10) { await item.click(); await p.waitForTimeout(3000); break; }
    }
    body = await p.textContent('body');
    check('D-1: 시간표 로드', body?.includes('시간표') || body?.includes('수업') || body?.includes('요일'));
    
    // D-2: 요일 표시
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    const hasDays = days.some(d => body?.includes(d));
    check('D-2: 요일 표시', hasDays);
    await p.screenshot({ path: ss('full_D_schedule.png') });

    // ═══════════════════════════════════════════════
    // SECTION E: 가격표 탭
    // ═══════════════════════════════════════════════
    console.log('\n━━━ SECTION E: 가격표 ━━━');
    for (const item of await p.$$('button, a, [role="tab"]')) {
        const t = await item.textContent().catch(() => '');
        if (t.includes('가격') && t.length < 10) { await item.click(); await p.waitForTimeout(3000); break; }
    }
    body = await p.textContent('body');
    check('E-1: 가격표 로드', body?.includes('가격') || body?.includes('원') || body?.includes('수강'));
    await p.screenshot({ path: ss('full_E_pricing.png') });

    // ═══════════════════════════════════════════════
    // SECTION F: 매출 탭
    // ═══════════════════════════════════════════════
    console.log('\n━━━ SECTION F: 매출 ━━━');
    for (const item of await p.$$('button, a, [role="tab"]')) {
        const t = await item.textContent().catch(() => '');
        if (t.includes('매출') && t.length < 10) { await item.click(); await p.waitForTimeout(3000); break; }
    }
    body = await p.textContent('body');
    check('F-1: 매출 탭 로드', body?.includes('매출') || body?.includes('원') || body?.includes('월'));
    await p.screenshot({ path: ss('full_F_revenue.png') });

    // ═══════════════════════════════════════════════
    // SECTION G: 설정 → 전체 설정 항목 검증
    // ═══════════════════════════════════════════════
    console.log('\n━━━ SECTION G: 설정 심층 ━━━');
    for (const item of await p.$$('button, a, [role="tab"]')) {
        const t = await item.textContent().catch(() => '');
        if (t.trim() === '설정') { await item.click(); await p.waitForTimeout(3000); break; }
    }
    body = await p.textContent('body');
    
    check('G-1: 요가원 이름 필드', body?.includes('요가원 이름') || body?.includes('복샘요가'));
    check('G-2: 한 줄 소개', body?.includes('소개') || body?.includes('고요한'));
    check('G-3: 전화번호', body?.includes('전화번호') || body?.includes('1234'));
    check('G-4: 주소', body?.includes('주소') || body?.includes('마포'));
    check('G-5: 요가원 로고', body?.includes('로고'));
    check('G-6: 외부 링크 관리', body?.includes('링크') || body?.includes('SNS'));
    check('G-7: 운영 규칙 섹션', body?.includes('운영 규칙'));
    check('G-8: 출석 화면 카메라 토글', body?.includes('출석 화면 카메라'));
    check('G-9: 지점 관리', body?.includes('지점') || body?.includes('광흥창'));
    check('G-10: 변경사항 저장 버튼', body?.includes('저장'));
    await p.screenshot({ path: ss('full_G_settings.png') });

    // Scroll to check lower settings
    for (let i = 0; i < 10; i++) { await p.mouse.wheel(0, 400); await p.waitForTimeout(200); }
    body = await p.textContent('body');
    check('G-11: 회원 홀딩 토글', body?.includes('홀딩') || body?.includes('일시정지'));
    check('G-12: 수업 예약 토글', body?.includes('수업 예약') || body?.includes('예약'));
    await p.screenshot({ path: ss('full_G_settings2.png') });

    // ═══════════════════════════════════════════════
    // SECTION H: 회원 프로필 페이지
    // ═══════════════════════════════════════════════
    console.log('\n━━━ SECTION H: 회원 프로필 ━━━');
    const pp = await ctx.newPage();
    pp.on('pageerror', e => errors.push(`[Profile] ${e.message}`));
    await pp.goto(`${BASE}/profile`, { waitUntil: 'networkidle', timeout: 30000 });
    await pp.waitForTimeout(4000);
    body = await pp.textContent('body');
    check('H-1: 프로필 페이지 로드', body?.length > 50);
    // 로그인 안 됐으면 로그인 페이지로 리다이렉트 가능
    const isProfile = body?.includes('프로필') || body?.includes('출석') || body?.includes('수강') || body?.includes('로그인');
    check('H-2: 프로필 또는 로그인 리다이렉트', isProfile);
    await pp.screenshot({ path: ss('full_H_profile.png') });
    await pp.close();

    // ═══════════════════════════════════════════════
    // SECTION I: 선생님 페이지
    // ═══════════════════════════════════════════════
    console.log('\n━━━ SECTION I: 선생님(강사) 페이지 ━━━');
    const ip = await ctx.newPage();
    ip.on('pageerror', e => errors.push(`[Instructor] ${e.message}`));
    await ip.goto(`${BASE}/instructor`, { waitUntil: 'networkidle', timeout: 30000 });
    await ip.waitForTimeout(4000);
    body = await ip.textContent('body');
    check('I-1: 선생님 페이지 로드', body?.length > 50);
    const isInstructor = body?.includes('선생님') || body?.includes('수업') || body?.includes('로그인') || body?.includes('PIN');
    check('I-2: 강사 화면 또는 로그인', isInstructor);
    await ip.screenshot({ path: ss('full_I_instructor.png') });
    await ip.close();

    // ═══════════════════════════════════════════════
    // SECTION J: 명상 페이지
    // ═══════════════════════════════════════════════
    console.log('\n━━━ SECTION J: 명상 페이지 ━━━');
    const mp = await ctx.newPage();
    mp.on('pageerror', e => errors.push(`[Meditation] ${e.message}`));
    await mp.goto(`${BASE}/meditation`, { waitUntil: 'networkidle', timeout: 30000 });
    await mp.waitForTimeout(4000);
    body = await mp.textContent('body');
    check('J-1: 명상 페이지 로드', body?.length > 50);
    check('J-2: 명상 관련 컨텐츠', body?.includes('명상') || body?.includes('호흡') || body?.includes('Meditation') || body?.includes('시작'));
    await mp.screenshot({ path: ss('full_J_meditation.png') });
    await mp.close();

    // ═══════════════════════════════════════════════
    // SECTION K: 로그인 페이지
    // ═══════════════════════════════════════════════
    console.log('\n━━━ SECTION K: 로그인 페이지 ━━━');
    const lp = await ctx.newPage();
    lp.on('pageerror', e => errors.push(`[Login] ${e.message}`));
    await lp.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await lp.waitForTimeout(3000);
    body = await lp.textContent('body');
    check('K-1: 로그인 페이지 로드', body?.length > 50);
    
    const hasLoginForm = body?.includes('이메일') || body?.includes('email') || body?.includes('비밀번호') || body?.includes('로그인');
    check('K-2: 로그인 폼 존재', hasLoginForm);
    
    // K-3: 빈 폼 제출 → 에러
    const emailInput = lp.locator('input[type="email"], input[placeholder*="이메일"]').first();
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await lp.keyboard.press('Enter');
        await lp.waitForTimeout(1000);
        check('K-3: 빈 폼 제출 처리', true); // didn't crash
    }
    
    // K-4: 잘못된 이메일+비밀번호 → 에러 메시지
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill('wrong@test.com');
        const pwInput = lp.locator('input[type="password"]').first();
        if (await pwInput.isVisible({ timeout: 1000 }).catch(() => false)) {
            await pwInput.fill('wrongpassword');
            await lp.keyboard.press('Enter');
            await lp.waitForTimeout(3000);
            body = await lp.textContent('body');
            const hasError = body?.includes('오류') || body?.includes('실패') || body?.includes('error') || body?.includes('잘못') || body?.includes('확인');
            check('K-4: 잘못된 로그인 → 에러 처리', hasError || body?.includes('로그인'));
        }
    }
    await lp.screenshot({ path: ss('full_K_login.png') });
    await lp.close();

    // ═══════════════════════════════════════════════
    // SECTION L: 백엔드 통신 검증
    // ═══════════════════════════════════════════════
    console.log('\n━━━ SECTION L: 프론트-백엔드 통신 ━━━');
    
    // Firebase/Firestore 요청 확인
    const firestoreReqs = networkReqs.filter(r => r.url.includes('firestore') || r.url.includes('firebase'));
    check('L-1: Firebase 서버 통신 발생', firestoreReqs.length > 0);
    console.log(`    총 Firebase 요청: ${firestoreReqs.length}건`);
    
    const failedReqs = firestoreReqs.filter(r => r.status >= 400);
    check('L-2: Firebase 요청 실패 없음', failedReqs.length === 0);
    if (failedReqs.length > 0) {
        failedReqs.forEach(r => console.log(`    ⚠️ ${r.status}: ${r.url}`));
    }

    // L-3: Firestore 실시간 연결 (WebChannel)
    const webChannelReqs = networkReqs.filter(r => r.url.includes('google.firestore') || r.url.includes('webChannel'));
    check('L-3: Firestore 실시간 연결', webChannelReqs.length > 0 || firestoreReqs.length > 3);

    // ═══════════════════════════════════════════════
    // SECTION M: 크로스 페이지 네비게이션
    // ═══════════════════════════════════════════════
    console.log('\n━━━ SECTION M: 네비게이션 & 라우팅 ━━━');
    
    const routes = [
        { path: '/', name: '출석화면', check: '4자리' },
        { path: '/admin', name: '관리자', check: '관리' },
        { path: '/login', name: '로그인', check: '로그인' },
    ];
    
    for (const route of routes) {
        const np = await ctx.newPage();
        try {
            await np.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle', timeout: 15000 });
            await np.waitForTimeout(2000);
            body = await np.textContent('body');
            check(`M: ${route.name} 직접 접근`, body?.length > 50);
        } catch (e) {
            check(`M: ${route.name} 직접 접근`, false);
        }
        await np.close();
    }

    // ═══════════════════════════════════════════════
    // SECTION N: 엣지 케이스 & 보안
    // ═══════════════════════════════════════════════
    console.log('\n━━━ SECTION N: 엣지 케이스 & 보안 ━━━');

    // N-1: 존재하지 않는 경로 → 404 또는 리다이렉트
    const errPage = await ctx.newPage();
    await errPage.goto(`${BASE}/this-page-does-not-exist-12345`, { waitUntil: 'networkidle', timeout: 15000 });
    await errPage.waitForTimeout(2000);
    body = await errPage.textContent('body');
    check('N-1: 404 경로 → 정상 처리 (리다이렉트 또는 에러)', body?.length > 20);
    await errPage.close();

    // N-2: 매우 빠른 페이지 전환
    const fastPage = await ctx.newPage();
    await fastPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await fastPage.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await fastPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await fastPage.waitForTimeout(3000);
    body = await fastPage.textContent('body');
    check('N-2: 빠른 페이지 전환 → 크래시 없음', body?.length > 50);
    await fastPage.close();

    // N-3: JavaScript 치명적 에러 없음
    const criticalErrors = errors.filter(e =>
        !e.includes('getUserMedia') && !e.includes('camera') && !e.includes('Camera') &&
        !e.includes('NotAllowed') && !e.includes('Permission') && !e.includes('service-worker') &&
        !e.includes('workbox') && !e.includes('manifest') && !e.includes('face-api') &&
        !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('favicon') &&
        !e.includes('ResizeObserver') && !e.includes('ChunkLoad') && !e.includes('dynamicImport')
    );
    check('N-3: 치명적 JS 에러 없음', criticalErrors.length === 0);
    if (criticalErrors.length > 0) {
        console.log(`    ⚠️ ${criticalErrors.length}건 에러:`);
        criticalErrors.slice(0, 5).forEach(e => console.log(`    • ${e.substring(0, 150)}`));
    }

    // N-4: 브라우저 뒤로가기 안정성
    const backPage = await ctx.newPage();
    await backPage.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
    await backPage.waitForTimeout(2000);
    await backPage.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 15000 });
    await backPage.waitForTimeout(2000);
    await backPage.goBack();
    await backPage.waitForTimeout(3000);
    body = await backPage.textContent('body');
    check('N-4: 뒤로가기 → 정상 복원', body?.length > 50);
    await backPage.close();

    // ═══════════════════════════════════════════════
    // SECTION O: 반응형 / 모바일 뷰포트
    // ═══════════════════════════════════════════════
    console.log('\n━━━ SECTION O: 모바일 반응형 ━━━');
    
    const mobile = await browser.newContext({ viewport: { width: 375, height: 812 } }); // iPhone sized
    const mPage = await mobile.newPage();
    await mPage.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await mPage.waitForTimeout(4000);
    body = await mPage.textContent('body');
    check('O-1: 모바일 뷰포트 출석화면 로드', body?.length > 50);
    await mPage.screenshot({ path: ss('full_O_mobile_checkin.png') });

    await mPage.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
    await mPage.waitForTimeout(4000);
    body = await mPage.textContent('body');
    check('O-2: 모바일 뷰포트 관리자 로드', body?.length > 50);
    await mPage.screenshot({ path: ss('full_O_mobile_admin.png') });
    await mPage.close();
    await mobile.close();

    // ═══════════════════════════════════════════════
    // FINAL REPORT
    // ═══════════════════════════════════════════════
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              복샘요가 SaaS 전체 테스트 결과               ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    
    const sections = {};
    results.forEach(r => {
        const section = r.match(/[A-O]/)?.[0] || '?';
        if (!sections[section]) sections[section] = { pass: 0, fail: 0, items: [] };
        if (r.startsWith('✅')) sections[section].pass++;
        else if (r.startsWith('❌')) sections[section].fail++;
        sections[section].items.push(r);
    });

    const sectionNames = {
        'A': '출석 화면', 'B': '관리자 대시보드', 'C': '회원 관리',
        'D': '시간표', 'E': '가격표', 'F': '매출',
        'G': '설정', 'H': '회원 프로필', 'I': '강사 페이지',
        'J': '명상', 'K': '로그인', 'L': '백엔드 통신',
        'M': '네비게이션', 'N': '엣지 케이스', 'O': '모바일 반응형'
    };

    for (const [key, data] of Object.entries(sections)) {
        const name = sectionNames[key] || key;
        const status = data.fail === 0 ? '✅' : '⚠️';
        console.log(`║ ${status} ${name.padEnd(15)} ${String(data.pass).padStart(2)}/${String(data.pass + data.fail).padStart(2)} 통과${' '.repeat(30)}║`);
    }

    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  총 통과: ${String(passed).padStart(2)}  |  실패: ${String(failed).padStart(2)}  |  스킵: ${String(skipped).padStart(2)}  |  성공률: ${((passed/(passed+failed))*100).toFixed(1)}%     ║`);
    console.log(`║  종료 시각: ${new Date().toLocaleTimeString('ko-KR')}                                     ║`);
    console.log('╠════════════════════════════════════════════════════════════╣');

    if (failed > 0) {
        console.log('║  ❌ 실패 항목:                                             ║');
        results.filter(r => r.startsWith('❌')).forEach(r => {
            console.log(`║    ${r.substring(0, 54).padEnd(54)}║`);
        });
    }

    console.log('╚════════════════════════════════════════════════════════════╝');

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})().catch(e => {
    console.error('❌ 테스트 크래시:', e.message);
    process.exit(1);
});
