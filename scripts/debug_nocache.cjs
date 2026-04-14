const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  
  // Disable cache
  await page.setCacheEnabled(false);
  
  const errors = [];
  const logs = [];
  
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    errors.push(err.toString());
  });
  page.on('requestfailed', req => {
    if (!req.url().includes('google')) {
      errors.push(`FAILED: ${req.url()} - ${req.failure().errorText}`);
    }
  });
  
  console.log('Navigating (no cache)...');
  
  try {
    await page.goto('https://boksaem-yoga.web.app/', { waitUntil: 'networkidle2', timeout: 30000 });
  } catch(e) {
    console.log('Nav error:', e.message);
  }
  
  await new Promise(r => setTimeout(r, 5000));
  
  const rootContent = await page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      innerHTML: root ? root.innerHTML.substring(0, 500) : 'NO ROOT',
      childCount: root ? root.children.length : 0,
      bodyText: document.body.innerText.substring(0, 300)
    };
  });
  
  console.log('\n=== PAGE ERRORS ===');
  errors.forEach(e => console.log(e));
  
  console.log('\n=== CONSOLE LOGS ===');
  logs.forEach(l => console.log(l));
  
  console.log('\n=== ROOT ===');
  console.log(JSON.stringify(rootContent, null, 2));
  
  await browser.close();
})();
