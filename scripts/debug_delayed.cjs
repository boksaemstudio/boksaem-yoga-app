const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });
  
  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
    console.log(err.stack);
  });
  
  console.log('Navigating...');
  try {
    await page.goto('https://boksaem-yoga.web.app/', { waitUntil: 'networkidle0', timeout: 30000 });
  } catch(e) {
    console.log('Nav:', e.message);
  }
  
  // Wait for 10 seconds to see if a delayed error occurs
  await new Promise(r => setTimeout(r, 10000));
  
  const rootContent = await page.evaluate(() => {
    return document.getElementById('root')?.innerHTML?.substring(0, 500) || 'NO ROOT';
  });
  
  console.log('\n=== ROOT HTML ===');
  console.log(rootContent);
  
  await browser.close();
})();
