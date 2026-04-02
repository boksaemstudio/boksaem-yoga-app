const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = path.join(__dirname, '..', '..', '..', 'brain', '203e9670-5474-4ce5-9bb6-ca64fe76496b');

async function runAudit() {
    console.log("🚀 [Playwright QA] 디자이너/사용자 관점 UI/UX 무결성 스캔 시작...");
    
    // Launch headless Chromium
    const browser = await chromium.launch({ headless: true });
    
    // 1. 쌍문요가 (SaaS 테넌트) 테스트
    console.log("🔍 [Tenant 1] 쌍문요가(SaaS) 접속 중...");
    const contextSsa = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageSsa = await contextSsa.newPage();
    
    // Set LocalStorage to simulate Ssangmun Studio scope
    await pageSsa.goto('http://localhost:5173');
    await pageSsa.evaluate(() => {
        localStorage.setItem('currentStudioId', 'ssangmun-yoga-app');
        localStorage.setItem('STUDIO_IDENTITY', JSON.stringify({
            tenantName: '쌍문요가',
            logoUrl: 'https://via.placeholder.com/300x100?text=Ssangmun+Yoga'
        }));
    });
    await pageSsa.reload();
    await pageSsa.waitForLoadState('networkidle');

    // Screenshot Landing
    const ssaLandingPath = path.join(ARTIFACTS_DIR, 'playwright_ssangmun_landing.png');
    await pageSsa.screenshot({ path: ssaLandingPath });
    console.log(`📸 쌍문요가 랜딩 스크린샷 저장: ${ssaLandingPath}`);

    // Verify DOM complexity (How many text elements?)
    const ssaTextCount = await pageSsa.evaluate(() => document.querySelectorAll('p, h1, h2, h3, span, div').length);
    console.log(`📊 쌍문요가 랜딩 DOM 복잡도 (텍스트 노드 수): ${ssaTextCount}`);

    // 2. 복샘요가 (Original Tenant) 테스트
    console.log("🔍 [Tenant 2] 복샘요가(본진) 접속 중... (🔥 READ-ONLY 검수 모드 유지)");
    const contextBok = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageBok = await contextBok.newPage();
    
    await pageBok.goto('http://localhost:5173');
    await pageBok.evaluate(() => {
        localStorage.setItem('currentStudioId', 'boksaem-yoga-app');
        // Clear pseudo-tenant to trigger default Boksaem fallback
        localStorage.removeItem('STUDIO_IDENTITY');
    });
    await pageBok.reload();
    await pageBok.waitForLoadState('networkidle');

    // Screenshot Landing
    const bokLandingPath = path.join(ARTIFACTS_DIR, 'playwright_boksaem_landing.png');
    await pageBok.screenshot({ path: bokLandingPath });
    console.log(`📸 복샘요가 랜딩 스크린샷 저장: ${bokLandingPath}`);

    // Check specific logos (PassFlow vs RYS200 vs Boksaem)
    const hasRYS200 = await pageBok.evaluate(() => document.body.innerText.includes('RYS200') || document.body.innerHTML.includes('rys200'));
    console.log(`🔎 복샘요가 고유 RYS200 로고 보존 여부: ${hasRYS200 ? '✅ 확인됨' : '❌ 누락됨(경고)'}`);

    // Check Mobile Viewport (Responsive Complexity)
    console.log("🔍 [Mobile View] 모바일 화면 복잡도 검사용 스냅샷...");
    const contextMobile = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true });
    const pageMobile = await contextMobile.newPage();
    await pageMobile.goto('http://localhost:5173');
    await pageMobile.evaluate(() => localStorage.setItem('currentStudioId', 'boksaem-yoga-app'));
    await pageMobile.reload();
    await pageMobile.waitForLoadState('networkidle');
    const mobileLandingPath = path.join(ARTIFACTS_DIR, 'playwright_mobile_landing.png');
    await pageMobile.screenshot({ path: mobileLandingPath, fullPage: true });
    console.log(`📸 모바일 반응형 렌더링 스크린샷 저장: ${mobileLandingPath}`);

    await browser.close();
    console.log("\n✅ Playwright 무결성 스캔 및 촬영이 완료되었습니다. 결과물을 AI 요원이 분석하여 최종 보고합니다.");
}

runAudit().catch(err => {
    console.error("Playwright Runtime Error:", err);
    process.exit(1);
});
