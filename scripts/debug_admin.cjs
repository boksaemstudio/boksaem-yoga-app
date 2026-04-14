const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', devtools: false });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  
  // Intercept REQUEST to find the JS file that causes the error
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.log(`[PAGE_ERROR] ${err.message}`);
    console.log(err.stack?.split('\n').slice(0,5).join('\n'));
  });
  
  // Navigate to /admin instead of / (kiosk) to test admin page
  console.log('=== Testing /admin ===');
  try {
    await page.goto('https://boksaem-yoga.web.app/admin', { waitUntil: 'networkidle2', timeout: 30000 });
  } catch(e) {
    console.log('Nav:', e.message);
  }
  await new Promise(r => setTimeout(r, 5000));
  
  const root = await page.evaluate(() => {
    return document.getElementById('root')?.innerHTML?.substring(0, 300) || 'EMPTY';
  });
  console.log('\n=== ROOT CONTENT ===');
  console.log(root);
  
  await browser.close();
})();
