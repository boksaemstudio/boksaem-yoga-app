const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Test Onboarding
    await page.goto('http://localhost:5174/onboarding', { waitUntil: 'networkidle0' });
    const manifestHref = await page.$eval('link[rel="manifest"]', el => el.href);
    console.log('[Onboarding] Manifest URL:', manifestHref);
    
    // Test Checkin
    await page.goto('http://localhost:5174/checkin', { waitUntil: 'networkidle0' });
    const manifestCheckinHref = await page.$eval('link[rel="manifest"]', el => el.href);
    console.log('[Checkin] Manifest URL:', manifestCheckinHref);
    
    await browser.close();
})();