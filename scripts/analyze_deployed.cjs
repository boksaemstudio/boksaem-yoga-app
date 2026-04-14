const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  
  // Intercept the index.html to find the actual bundle filename
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/assets/index-') && url.endsWith('.js') && !url.includes('legacy')) {
      console.log('Found index bundle:', url);
      try {
        const body = await response.text();
        // Search for standalone t( at specific position
        // From screenshot: position ~658581
        // Look around that area
        const searchStr = 't("g_';
        let pos = 0;
        let count = 0;
        while ((pos = body.indexOf(searchStr, pos)) !== -1) {
          // Check char before t
          const charBefore = pos > 0 ? body[pos-1] : '';
          if (charBefore !== '.' && charBefore !== '_') {
            count++;
            if (count <= 3) {
              const ctx = body.substring(Math.max(0, pos-50), pos+50);
              console.log(`\n[${count}] at position ${pos}: ...${ctx}...`);
            }
          }
          pos += 1;
        }
        console.log(`\nTotal t("g_ in deployed bundle: ${count}`);
      } catch(e) {
        console.log('Failed to read body:', e.message);
      }
    }
  });
  
  try {
    await page.goto('https://boksaem-yoga.web.app/', { waitUntil: 'networkidle2', timeout: 20000 });
  } catch(e) {}
  
  await browser.close();
})();
