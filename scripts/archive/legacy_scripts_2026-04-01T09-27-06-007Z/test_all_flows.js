import { chromium } from 'playwright';

(async () => {
    console.log('--- STARTING COMPREHENSIVE E2E LOCALHOST TESTS ---');
    console.log('Target: http://localhost:5173');
    
    // Launch browser
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true
    });
    
    let hasErrors = false;

    // Helper: Test a flow safely
    async function testFlow(name, url, actions) {
        console.log(`\n▶️ Testing Flow: ${name} [${url}]`);
        const page = await context.newPage();
        try {
            // Listen for uncaught errors
            page.on('pageerror', exception => {
                console.error(`💥 [${name}] Uncaught exception on page:`, exception);
                hasErrors = true;
            });
            // Listen for console errors to get the exact stack trace
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    console.log(`[${name} Console Error]`, msg.text());
                }
            });

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await actions(page);
            console.log(`✅ [${name}] Flow completed successfully without crashing.`);
        } catch (e) {
            console.error(`❌ [${name}] Flow failed:`, e.message);
            hasErrors = true;
            await page.screenshot({ path: `error_${name.replace(/\s/g, '_')}.png` });
        } finally {
            await page.close();
        }
    }

    try {
        // 1. KIOSK TEST (Check-in)
        await testFlow('Kiosk Check-in 5454', 'http://localhost:5173/', async (page) => {
            await page.waitForSelector('.keypad-grid', { timeout: 10000 });
            await page.locator('button.keypad-btn', { hasText: '5' }).click();
            await page.waitForTimeout(100);
            await page.locator('button.keypad-btn', { hasText: '4' }).click();
            await page.waitForTimeout(100);
            await page.locator('button.keypad-btn', { hasText: '5' }).click();
            await page.waitForTimeout(100);
            await page.locator('button.keypad-btn', { hasText: '4' }).click();
            
            // Wait for modal or success text
            await page.waitForTimeout(2000);
            const content = await page.content();
            if (content.includes('찾을 수 없습니다')) {
                throw new Error('Member 5454 not found on local server');
            }
        });

        // 2. ADMIN APP TEST (Render check)
        await testFlow('Admin Dashboard Render', 'http://localhost:5173/admin', async (page) => {
            await page.waitForSelector('body', { timeout: 5000 });
            await page.waitForTimeout(3000);
            const content = await page.content();
            if (content.includes('ReferenceError') || content.includes('Critical Error')) {
                throw new Error('Admin Dashboard crashed during render');
            }
        });

        // 3. INSTRUCTOR APP TEST
        await testFlow('Instructor App Render', 'http://localhost:5173/instructor', async (page) => {
            await page.waitForSelector('body', { timeout: 5000 });
            await page.waitForTimeout(2000);
            const content = await page.content();
            if (content.includes('Critical Error')) {
                throw new Error('Instructor App crashed during render');
            }
        });

        // 4. MEMBER APP TEST
        await testFlow('Member App Render', 'http://localhost:5173/member', async (page) => {
            await page.waitForSelector('body', { timeout: 5000 });
            await page.waitForTimeout(2000);
            const content = await page.content();
            if (content.includes('Critical Error')) {
                throw new Error('Member App crashed during render');
            }
        });

    } finally {
        await browser.close();
        if (hasErrors) {
            console.log('\n❌ TESTS FINISHED WITH ERRORS.');
            process.exit(1);
        } else {
            console.log('\n✨ ALL TESTS PASSED. The core code works fine locally!');
        }
    }
})();
