const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
    
    console.log('=== Phase 3 테스트 ===\n');
    let passed = 0, failed = 0;
    
    // 1. 설정 페이지
    console.log('1. 설정 페이지...');
    await page.goto('http://localhost:5173/admin', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(5000);
    
    // 설정 탭
    const allEls = await page.$$('button, a, span, div');
    for (const el of allEls) {
        const text = await el.textContent().catch(() => '');
        if (text && text.trim() === '설정') { await el.click().catch(() => {}); break; }
    }
    await page.waitForTimeout(2000);
    
    // 예약 토글 ON (스크롤 필요)
    await page.evaluate(() => {
        const labels = document.querySelectorAll('label');
        labels.forEach(l => {
            const parent = l.closest('div');
            if (parent && parent.textContent.includes('수업 예약')) {
                const checkbox = l.querySelector('input[type="checkbox"]');
                if (checkbox && !checkbox.checked) checkbox.click();
            }
        });
    });
    await page.waitForTimeout(1500);
    
    // 스크롤 다운해서 예약 설정 보기
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);
    
    const bodyText = await page.textContent('body');
    
    // 지점별 정원 확인
    const checks = [
        ['수업 예약 섹션', '수업 예약'],
        ['기본값 라벨', '기본값'],
        ['광흥창 지점', '광흥창'],
        ['마포 지점', '마포'],
        ['수업당 최대 인원', '수업당 최대 인원'],
        ['예약 가능 기간', '예약 가능 기간'],
        ['노쇼', '노쇼'],
        ['대기열', '대기열'],
        ['출석 화면 카메라', '출석 화면 카메라'],
    ];
    
    for (const [name, pattern] of checks) {
        const ok = bodyText.includes(pattern);
        console.log(`   ${ok ? '✅' : '❌'} ${name}: ${ok ? 'PASS' : 'FAIL'}`);
        if (ok) passed++; else failed++;
    }
    
    await page.screenshot({ path: 'scripts/test_branch_capacity.png', fullPage: false });
    console.log('   스크린샷: scripts/test_branch_capacity.png');
    
    // 2. bookingService.js 검증
    console.log('\n2. bookingService.js 코드 검증...');
    const svc = fs.readFileSync('src/services/bookingService.js', 'utf-8');
    const codeCk = [
        ['createBooking', 'createBooking'],
        ['cancelBooking', 'cancelBooking'],
        ['validateBooking', 'validateBooking'],
        ['markAttendance', 'markAttendance'],
        ['markNoshow', 'markNoshow'],
        ['getClassCapacity', 'getClassCapacity'],
        ['promoteWaitlist', 'promoteWaitlist'],
        ['branchCapacity', 'branchCapacity'],
        ['subscribeMemberBookings', 'subscribeMemberBookings'],
        ['getBookingStats', 'getBookingStats'],
    ];
    for (const [name, pattern] of codeCk) {
        const ok = svc.includes(pattern);
        console.log(`   ${ok ? '✅' : '❌'} ${name}: ${ok ? 'PASS' : 'FAIL'}`);
        if (ok) passed++; else failed++;
    }
    
    console.log(`\n=== 결과: ${passed} PASS / ${failed} FAIL ===`);
    await browser.close();
})().catch(e => { console.error('실패:', e.message); process.exit(1); });
