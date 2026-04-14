const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    
    console.log('Navigating to checkin page...');
    await page.goto('http://localhost:5173/checkin', { waitUntil: 'networkidle0' });
    console.log('Page loaded');
    await browser.close();
})();
