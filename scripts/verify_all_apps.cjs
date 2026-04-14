const puppeteer = require('puppeteer');
const fs = require('fs');

async function testApp(url, name) {
  console.log(`[${name}] Loading ${url}...`);
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1280, height: 800 });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('Failed to load resource')) {
        errors.push(text);
      }
    }
  });

  page.on('pageerror', err => {
    errors.push(err.message);
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    // 대기 추가: React useEffect 처리를 위해 시간 확보
    await new Promise(r => setTimeout(r, 4000));
    
    // 추가 렌더링 검사 (React 트리가 마비되었는지)
    const rootHTML = await page.evaluate(() => {
      const el = document.getElementById('root');
      return el ? el.innerHTML : null;
    });

    if (rootHTML === null || rootHTML === '' || rootHTML.includes('시스템 오류 발생') || rootHTML.includes('ErrorBoundary')) {
       errors.push('CRITICAL: Empty root or ErrorBoundary triggered!');
    }

    const timestamp = Date.now();
    const screenshotPath = `C:/Users/boksoon/.gemini/antigravity/brain/d3d2cb9f-25e0-441b-9eae-5692b1c567ec/verify_${name}_${timestamp}.png`;
    await page.screenshot({ path: screenshotPath });
    
    console.log(`[${name}] SUCCESS: No layout crashes. Layout screenshot saved.`);
    if (errors.length > 0) {
      console.log(`[${name}] ERRORS LOGGED:`, errors);
    } else {
      console.log(`[${name}] Clean runtime.`);
    }
  } catch (error) {
    console.log(`[${name}] FAILED to load:`, error.message);
  } finally {
    await browser.close();
  }
}

(async () => {
  const baseUrl = 'https://boksaem-yoga.web.app';
  // 캐시 무효화를 위해 타임스탬프 추가
  const t = Date.now();
  await testApp(`${baseUrl}/?t=${t}`, 'Kiosk');
  await testApp(`${baseUrl}/admin?t=${t}`, 'Admin');
  await testApp(`${baseUrl}/instructor/dashboard?t=${t}`, 'Instructor');
  await testApp(`${baseUrl}/member/class?t=${t}`, 'Member');
  
  console.log('\\n=== Verification Complete ===');
})();
