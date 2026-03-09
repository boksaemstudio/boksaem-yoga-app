import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const artifactDir = 'C:/Users/boksoon/.gemini/antigravity/brain/41c495e2-0585-4d5f-993e-970b4810e21f';

try {
    console.log('=== 1. 멤버 페이지 로드 ===');
    await page.goto('https://boksaem-yoga.web.app/member', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(5000);
    
    // Enter test member info
    const nameInput = page.locator('input[placeholder*="이름"]');
    if (await nameInput.count() > 0) {
        await nameInput.fill('테스트');
        await page.locator('input[placeholder*="4자리"]').fill('1234');
        await page.click('button:has-text("나의 수련 여정 보기")');
        await page.waitForTimeout(5000);
        
        // Check "시간표" tab
        const scheduleTab = page.locator('button:has-text("시간표"), div:has-text("시간표")').first();
        if (await scheduleTab.count() > 0) {
            await scheduleTab.click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: `${artifactDir}/live_schedule_tab.png`, fullPage: false });
            console.log('시간표 스크린샷 저장됨');
            
            const allText = await page.textContent('body');
            const hasBranchPrefix = allText.includes('branch광흥창') || allText.includes('branch마포');
            console.log('branch 접두사:', hasBranchPrefix ? '❌ 있음' : '✅ 없음');
        }
        
        // Check "가격표" tab
        const priceTab = page.locator('button:has-text("가격표"), div:has-text("가격표")').first();
        if (await priceTab.count() > 0) {
            await priceTab.click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: `${artifactDir}/live_price_tab.png`, fullPage: false });
            console.log('가격표 스크린샷 저장됨');
        }
    } else {
        await page.screenshot({ path: `${artifactDir}/live_member_initial.png`, fullPage: false });
        console.log('입력 필드 미발견, 페이지 스크린샷만 저장');
    }
} catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: `${artifactDir}/live_error.png`, fullPage: false });
}

await browser.close();
console.log('=== 완료 ===');
