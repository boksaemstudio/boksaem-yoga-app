const { chromium } = require('playwright'); // Ensure playwright is installed, if not we can use another method or just puppeteer

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    await page.goto('https://passflowai.web.app/super-admin', { waitUntil: 'networkidle' });
    await browser.close();
})();
