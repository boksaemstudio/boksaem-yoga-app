const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[ERROR] ${msg.text()}`);
  });

  // Test / (kiosk)
  console.log('=== Testing / ===');
  try {
    await page.goto('https://boksaem-yoga.web.app/', { waitUntil: 'networkidle0', timeout: 20000 });
  } catch(e) { console.log('Nav:', e.message); }
  await new Promise(r => setTimeout(r, 3000));
  let root = await page.evaluate(() => document.getElementById('root')?.children.length || 0);
  console.log('Root children:', root);

  // Test /member
  console.log('\n=== Testing /member ===');
  try {
    await page.goto('https://boksaem-yoga.web.app/member', { waitUntil: 'networkidle0', timeout: 20000 });
  } catch(e) { console.log('Nav:', e.message); }
  await new Promise(r => setTimeout(r, 3000));
  root = await page.evaluate(() => document.getElementById('root')?.children.length || 0);
  console.log('Root children:', root);

  // Test /checkin
  console.log('\n=== Testing /checkin ===');
  try {
    await page.goto('https://boksaem-yoga.web.app/checkin', { waitUntil: 'networkidle0', timeout: 20000 });
  } catch(e) { console.log('Nav:', e.message); }
  await new Promise(r => setTimeout(r, 3000));
  root = await page.evaluate(() => document.getElementById('root')?.children.length || 0);
  console.log('Root children:', root);
  
  await browser.close();
})();
