const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const errors = [];
  const logs = [];
  
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
  });
  page.on('pageerror', err => {
    errors.push(err.toString());
  });
  page.on('requestfailed', req => {
    errors.push(`FAILED REQUEST: ${req.url()} - ${req.failure().errorText}`);
  });
  
  console.log('Navigating to https://boksaem-yoga.web.app/ ...');
  
  try {
    await page.goto('https://boksaem-yoga.web.app/', { waitUntil: 'networkidle2', timeout: 30000 });
  } catch(e) {
    console.log('Navigation error:', e.message);
  }
  
  // Wait extra time for React to mount
  await new Promise(r => setTimeout(r, 5000));
  
  // Check if root has content
  const rootContent = await page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      innerHTML: root ? root.innerHTML.substring(0, 500) : 'NO ROOT',
      childCount: root ? root.children.length : 0,
      bodyText: document.body.innerText.substring(0, 200)
    };
  });
  
  console.log('\n=== PAGE ERRORS ===');
  errors.forEach(e => console.log(e));
  
  console.log('\n=== CONSOLE LOGS (last 20) ===');
  logs.slice(-20).forEach(l => console.log(l));
  
  console.log('\n=== ROOT CONTENT ===');
  console.log(JSON.stringify(rootContent, null, 2));
  
  await browser.close();
})();
