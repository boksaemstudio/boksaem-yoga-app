import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
        page.on('pageerror', error => console.log('PAGE ERROR STR:', error.toString(), '\nSTACK:', error.stack));
        
        console.log('Navigating to deployed site...');
        const response = await page.goto('https://passflowai.web.app/super-admin', { waitUntil: 'networkidle2' });
        console.log('Response status:', response.status());
        
        await new Promise(r => setTimeout(r, 3000));
        await browser.close();
        console.log('Done.');
    } catch (err) {
        console.error('Puppeteer Script Error:', err);
    }
})();
