const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('https://boksaem-yoga.web.app/');
  
  // wait a bit for any react rendering errors
  await new Promise(r => setTimeout(r, 3000));
  
  await browser.close();
})();
