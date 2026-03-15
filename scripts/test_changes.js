const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    
    console.log('=== Playwright 테스트 시작 ===\n');
    
    // 1. 관리자 설정 페이지 테스트
    console.log('1. 관리자 설정 페이지 접속...');
    await page.goto('https://boksaem-yoga.web.app/admin', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // 설정 탭 클릭
    const settingsTab = page.locator('text=설정').first();
    if (await settingsTab.isVisible()) {
        await settingsTab.click();
        await page.waitForTimeout(2000);
    } else {
        // 기어 아이콘 찾기
        const gearIcon = page.locator('[data-testid="settings-tab"], a[href*="settings"]').first();
        if (await gearIcon.count() > 0) {
            await gearIcon.click();
            await page.waitForTimeout(2000);
        }
    }
    
    await page.screenshot({ path: '/tmp/test_settings_top.png', fullPage: false });
    console.log('   스크린샷: /tmp/test_settings_top.png');
    
    // 설정 페이지 내용 확인
    const pageContent = await page.textContent('body');
    
    const checks = [
        { name: '우리 요가원 설정', pattern: '우리 요가원 설정', shouldExist: true },
        { name: '우리 요가원 카드', pattern: '우리 요가원', shouldExist: true },
        { name: '한 줄 소개', pattern: '한 줄 소개', shouldExist: true },
        { name: '운영 규칙', pattern: '운영 규칙', shouldExist: true },
        { name: '회원 홀딩', pattern: '회원 홀딩', shouldExist: true },
        { name: '수업 예약', pattern: '수업 예약', shouldExist: true },
        { name: '출석 화면 카메라', pattern: '출석 화면 카메라', shouldExist: true },
        { name: '브랜드 테마 삭제됨', pattern: '브랜드 테마', shouldExist: false },
        { name: 'Theme 삭제됨', pattern: '(Theme)', shouldExist: false },
        { name: 'Identity 삭제됨', pattern: '(Identity)', shouldExist: false },
        { name: 'Policies 삭제됨', pattern: '(Policies)', shouldExist: false },
        { name: '앱 버전 삭제됨', pattern: '앱 버전', shouldExist: false },
        { name: '프라이머리 컬러 삭제됨', pattern: '프라이머리 컬러', shouldExist: false },
        { name: '스켈레톤 컬러 삭제됨', pattern: '스켈레톤 컬러', shouldExist: false },
        { name: '세션 자동 종료 삭제됨', pattern: '세션 자동 종료', shouldExist: false },
        { name: '정책 임계값 삭제됨', pattern: '정책 임계값', shouldExist: false },
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const check of checks) {
        const exists = pageContent.includes(check.pattern);
        const ok = check.shouldExist ? exists : !exists;
        console.log(`   ${ok ? '✅' : '❌'} ${check.name}: ${ok ? 'PASS' : 'FAIL'}`);
        if (ok) passed++; else failed++;
    }
    
    // 스크롤 다운해서 전체 보기
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/test_settings_mid.png', fullPage: false });
    console.log('   스크린샷: /tmp/test_settings_mid.png');
    
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/test_settings_bottom.png', fullPage: false });
    console.log('   스크린샷: /tmp/test_settings_bottom.png');
    
    // 2. 매출 탭 - 차트 범례 테스트
    console.log('\n2. 매출 탭 - 차트 범례 테스트...');
    const revenueTab = page.locator('text=매출').first();
    if (await revenueTab.isVisible()) {
        await revenueTab.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: '/tmp/test_charts.png', fullPage: false });
        console.log('   스크린샷: /tmp/test_charts.png');
        
        // 범례 확인
        const legendExists = await page.locator('.recharts-legend-wrapper').count() > 0;
        console.log(`   ${legendExists ? '✅' : '❌'} 차트 범례 존재: ${legendExists ? 'PASS' : 'FAIL'}`);
        if (legendExists) passed++; else failed++;
        
        // 스크롤해서 막대 차트 범례도 확인
        await page.evaluate(() => window.scrollBy(0, 400));
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '/tmp/test_charts_bar.png', fullPage: false });
        console.log('   스크린샷: /tmp/test_charts_bar.png');
    }
    
    console.log(`\n=== 결과: ${passed} PASS / ${failed} FAIL ===`);
    
    await browser.close();
})();
