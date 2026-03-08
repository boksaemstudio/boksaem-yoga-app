import { chromium } from 'playwright';

(async () => {
  console.log('Starting Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to https://boksaem-yoga.web.app/ ...');
    await page.goto('https://boksaem-yoga.web.app/', { waitUntil: 'domcontentloaded' });

    console.log('Waiting for the number pad to render...');
    // The number pad digits are buttons with the class 'keypad-btn'
    await page.waitForSelector('button.keypad-btn:has-text("5")');

    console.log('Clicking 5, 4, 5, 4...');
    await page.locator('button.keypad-btn', { hasText: '5' }).click();
    await page.waitForTimeout(300);
    await page.locator('button.keypad-btn', { hasText: '4' }).click();
    await page.waitForTimeout(300);
    await page.locator('button.keypad-btn', { hasText: '5' }).click();
    await page.waitForTimeout(300);
    await page.locator('button.keypad-btn', { hasText: '4' }).click();

    console.log('Waiting for the result modal...');
    // We should either see a success message or an error message.
    // The success message shows the member name. The error message shows "찾을 수 없습니다".
    // Wait for the modal content to appear
    await page.waitForTimeout(2000); // Give it 2 seconds to fetch from DB and show modal

    // Check for success or error text
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('--- Page Text Output ---');
    if (pageText.includes('성예린')) {
      console.log('✅ SUCCESS: Found member 성예린!');
    } else if (pageText.includes('찾을 수 없습니다')) {
      console.log('❌ FAILED: Member not found error displayed.');
    } else {
      console.log('⚠️ UNKNOWN RESULT: Could not find clear success or error message.');
      console.log(pageText.substring(0, 500) + '...');
    }

    // Capture screenshot
    await page.screenshot({ path: 'test_result.png' });
    console.log('Screenshot saved to test_result.png');

  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    await browser.close();
  }
})();
