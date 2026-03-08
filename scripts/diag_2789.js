import { chromium } from 'playwright';

(async () => {
    console.log('--- LIVE KIOSK 2789 CHECK-IN DIAGNOSTIC ---');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    
    // Capture ALL console messages
    page.on('console', msg => {
        const type = msg.type();
        if (type === 'error' || type === 'warn') {
            console.log(`[${type.toUpperCase()}]`, msg.text());
        } else if (msg.text().includes('CheckIn') || msg.text().includes('member') || msg.text().includes('2789') || msg.text().includes('SaaS') || msg.text().includes('findMember') || msg.text().includes('Firebase') || msg.text().includes('auth')) {
            console.log(`[LOG]`, msg.text());
        }
    });
    
    page.on('pageerror', err => console.error('[PAGE ERROR]', err.message));
    
    try {
        await page.goto('https://boksaem-yoga.web.app/', { waitUntil: 'domcontentloaded' });
        console.log('Page loaded. Waiting for keypad...');
        
        await page.waitForSelector('.keypad-grid', { timeout: 10000 });
        console.log('Keypad found. Typing 2789...');
        
        await page.locator('button.keypad-btn', { hasText: '2' }).click();
        await page.waitForTimeout(100);
        await page.locator('button.keypad-btn', { hasText: '7' }).click();
        await page.waitForTimeout(100);
        await page.locator('button.keypad-btn', { hasText: '8' }).click();
        await page.waitForTimeout(100);
        await page.locator('button.keypad-btn', { hasText: '9' }).click();
        
        console.log('Waiting 5 seconds for check-in response...');
        await page.waitForTimeout(5000);
        
        const bodyText = await page.evaluate(() => document.body.innerText);
        console.log('\n--- VISIBLE PAGE TEXT (first 500 chars) ---');
        console.log(bodyText.substring(0, 500));
        
        await page.screenshot({ path: 'diag_2789.png' });
        console.log('Screenshot saved.');
        
    } catch (e) {
        console.error('Test failed:', e.message);
    } finally {
        await browser.close();
    }
})();
