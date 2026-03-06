const puppeteer = require('puppeteer-core');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({ executablePath: edgePath, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));
    page.on('requestfailed', req => console.error('NET ERROR:', req.url(), req.failure()?.errorText));

    console.log('Navigating to http://localhost:4173 ...');
    // Using waitUntil: 'load' instead of networkidle
    await page.goto('http://localhost:4173', { waitUntil: 'load', timeout: 10000 });
    
    console.log('Waiting 5 seconds to observer ErrorBoundary...');
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('Test completed safely.');
  } catch(e) { 
    console.error('TEST SCRIPT CRASH:', e); 
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
    process.exit(0);
  }
})();
