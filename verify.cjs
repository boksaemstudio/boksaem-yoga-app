const { chromium, devices } = require('playwright');
const path = require('path');

(async () => {
    try {
        console.log("Launching browser...");
        const browser = await chromium.launch({ headless: true });
        
        console.log("Testing Desktop PassFlowAi...");
        const p1 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        await p1.goto('https://passflowai.web.app/features.html', { waitUntil: 'load', timeout: 30000 });
        await p1.screenshot({ path: path.join('.gemini', 'features_page_verify.png'), fullPage: true });

        console.log("Testing Mobile Compact View Admin...");
        const ctx = await browser.newContext(devices['iPhone 12']);
        const p2 = await ctx.newPage();
        
        // Use a mock route to block slow things if needed
        await p2.route('**/*', route => {
            if (route.request().resourceType() === 'image') return route.continue();
            route.continue();
        });

        await p2.goto('https://passflowai.web.app/admin?studio=demo-yoga', { waitUntil: 'load', timeout: 30000 });
        await p2.evaluate(() => {
            window.localStorage.setItem('adminToken', 'DEMO_BYPASS'); 
            window.localStorage.setItem('admin_token', 'DEMO_BYPASS'); 
            window.localStorage.setItem('viewMode', 'compact'); 
        });
        await p2.reload({ waitUntil: 'load', timeout: 30000 });
        await p2.waitForTimeout(5000); // 5 sec wait for rendering
        await p2.screenshot({ path: path.join('.gemini', 'mobile_admin_compact.png'), fullPage: true });

        await browser.close();
        console.log("✅ Verification Script Success!");
    } catch (e) {
        console.error("❌ Verification Failed", e);
    }
})();
