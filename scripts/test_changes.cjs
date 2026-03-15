const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    
    console.log('=== Playwright 테스트 시작 ===\n');
    
    // 1. 관리자 설정 페이지 테스트
    console.log('1. 관리자 설정 페이지 접속...');
    try {
        await page.goto('http://localhost:5173/admin', { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(5000);
    } catch(e) {
        console.log('   localhost:5173 실패, 127.0.0.1 시도...');
        await page.goto('http://127.0.0.1:5173/admin', { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(5000);
    }
    
    // 설정 탭 클릭 시도
    try {
        // 여러 가능한 선택자 시도
        const tabs = await page.$$('button, a, div[role="tab"]');
        for (const tab of tabs) {
            const text = await tab.textContent().catch(() => '');
            if (text && text.includes('설정')) {
                await tab.click();
                await page.waitForTimeout(3000);
                break;
            }
        }
    } catch(e) {
        console.log('   설정 탭 클릭 시도 실패:', e.message);
    }
    
    await page.screenshot({ path: 'scripts/test_settings_top.png', fullPage: false });
    console.log('   스크린샷: scripts/test_settings_top.png');
    
    // 설정 페이지 내용 확인
    const pageContent = await page.textContent('body').catch(() => '');
    
    if (!pageContent) {
        console.log('   ❌ 페이지 내용을 가져올 수 없습니다');
        await browser.close();
        return;
    }
    
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
    
    // 스크롤 다운
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scripts/test_settings_mid.png', fullPage: false });
    console.log('   스크린샷: scripts/test_settings_mid.png');
    
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scripts/test_settings_bottom.png', fullPage: false });
    console.log('   스크린샷: scripts/test_settings_bottom.png');
    
    // 2. 매출 탭 - 차트 범례 테스트
    console.log('\n2. 매출 탭 - 차트 범례 테스트...');
    try {
        const allElements = await page.$$('button, a, div[role="tab"], span');
        for (const el of allElements) {
            const text = await el.textContent().catch(() => '');
            if (text && text.trim() === '매출') {
                await el.click();
                await page.waitForTimeout(3000);
                break;
            }
        }
        
        await page.screenshot({ path: 'scripts/test_charts.png', fullPage: false });
        console.log('   스크린샷: scripts/test_charts.png');
        
        const legendCount = await page.$$eval('.recharts-legend-wrapper', els => els.length);
        console.log(`   ${legendCount > 0 ? '✅' : '❌'} 차트 범례 존재 (${legendCount}개): ${legendCount > 0 ? 'PASS' : 'FAIL'}`);
        if (legendCount > 0) passed++; else failed++;
        
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'scripts/test_charts_bar.png', fullPage: false });
        console.log('   스크린샷: scripts/test_charts_bar.png');
    } catch(e) {
        console.log('   매출 탭 테스트 실패:', e.message);
    }
    
    console.log(`\n=== 결과: ${passed} PASS / ${failed} FAIL ===`);
    
    await browser.close();
})().catch(e => {
    console.error('테스트 실패:', e.message);
    process.exit(1);
});
