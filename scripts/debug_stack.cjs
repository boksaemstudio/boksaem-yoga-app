const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setCacheEnabled(false);
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[CONSOLE ERROR] ${msg.text()}`);
      // Try to get stack trace
      const args = msg.args();
      args.forEach(async (arg, i) => {
        try {
          const val = await arg.jsonValue();
          if (typeof val === 'string' && val.includes('stack')) {
            console.log(`  ARG[${i}]: ${val}`);
          }
        } catch(e) {}
      });
    }
  });
  
  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
    if (err.stack) {
      // Show only first few lines of stack
      const lines = err.stack.split('\n').slice(0, 8);
      lines.forEach(l => console.log(`  ${l}`));
    }
  });
  
  try {
    await page.goto('https://boksaem-yoga.web.app/', { waitUntil: 'networkidle2', timeout: 30000 });
  } catch(e) {
    console.log('Nav:', e.message);
  }
  
  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
})();
