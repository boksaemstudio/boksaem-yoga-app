import { chromium } from 'playwright';

(async () => {
    console.log('--- LIVE SITE E2E TEST (boksaem-yoga.web.app) ---');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true
    });
    
    const apps = [
        { name: 'Kiosk (출석체크)', url: 'https://boksaem-yoga.web.app/' },
        { name: 'Admin (관리자)', url: 'https://boksaem-yoga.web.app/admin' },
        { name: 'Instructor (강사)', url: 'https://boksaem-yoga.web.app/instructor' },
        { name: 'Member (회원)', url: 'https://boksaem-yoga.web.app/member' },
    ];
    
    let allPassed = true;

    for (const app of apps) {
        console.log(`\n▶️ Testing: ${app.name} [${app.url}]`);
        const page = await context.newPage();
        let errors = [];
        
        page.on('pageerror', err => {
            errors.push(err.message);
        });
        
        try {
            await page.goto(app.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForTimeout(3000);
            
            const content = await page.content();
            
            // Check for v12 in the page
            const bodyText = await page.evaluate(() => document.body.innerText);
            const hasV12 = bodyText.includes('v12') || content.includes('v12');
            const hasV11 = content.includes('-v11.');
            
            // Check for fatal crash
            const hasCrash = content.includes('ReferenceError') || 
                             content.includes('시스템 오류 발생') ||
                             content.includes('Critical Error');
            
            // Take screenshot
            const ssName = `live_${app.name.replace(/[^a-zA-Z]/g, '_')}.png`;
            await page.screenshot({ path: ssName });
            
            if (hasCrash) {
                console.log(`❌ ${app.name}: CRASHED (Fatal JS Error)`);
                allPassed = false;
            } else if (hasV11) {
                console.log(`⚠️ ${app.name}: Still serving v11 cached assets`);
                allPassed = false;
            } else {
                console.log(`✅ ${app.name}: Loaded successfully (v12: ${hasV12})`);
            }
            
            if (errors.length > 0) {
                console.log(`   ⚠️ Page errors: ${errors.slice(0, 3).join(' | ')}`);
            }
            
        } catch (e) {
            console.error(`❌ ${app.name}: Failed to load - ${e.message}`);
            allPassed = false;
        } finally {
            await page.close();
        }
    }

    await browser.close();
    console.log(allPassed ? '\n✨ ALL APPS OK!' : '\n❌ SOME APPS HAVE ISSUES');
})();
