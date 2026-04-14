const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

(async () => {
  console.log('Starting vite...');
  const child = spawn('npx.cmd', ['vite', '--port', '5173'], { stdio: 'pipe' });
  child.stdout.on('data', d => console.log('VITE:', d.toString()));
  
  console.log('Waiting for dev server...');
  await new Promise(r => setTimeout(r, 5000));
  
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
  
  await new Promise(r => setTimeout(r, 10000));
  
  await browser.close();
  child.kill();
  process.exit(0);
})();
