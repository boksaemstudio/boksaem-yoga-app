const puppeteer = require('puppeteer');

(async () => {
  console.log('Waiting for dev server to start processing...');
  await new Promise(r => setTimeout(r, 6000));
  
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
    console.log(err.stack);
  });
  
  try {
    await page.goto('http://localhost:5173/?tenantId=boksaem-yoga', { waitUntil: 'networkidle0', timeout: 30000 });
  } catch(e) {
    console.log('Nav error:', e.message);
  }
  
  await new Promise(r => setTimeout(r, 8000));
  
  await browser.close();
  process.exit(0);
})();
