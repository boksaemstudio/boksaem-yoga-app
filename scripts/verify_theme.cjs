const { chromium } = require('playwright');
const path = require('path');

async function testTheme() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to app...');
  await page.goto('http://localhost:5173/login');
  
  // wait for it to render
  await page.waitForTimeout(2000);
  
  const artifactPath = path.join('C:\\Users\\boksoon\\.gemini\\antigravity\\brain\\d550a6af-6fcb-4bac-9519-6655803b905e', 'blue_theme_test.png');
  await page.screenshot({ path: artifactPath, fullPage: true });
  console.log('Saved screenshot to:', artifactPath);
  
  await browser.close();
}

testTheme().catch(console.error);
