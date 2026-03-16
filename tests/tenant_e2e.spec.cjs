const { test, expect } = require('@playwright/test');

const BASE = 'https://boksaem-yoga.web.app';

test.describe('SaaS 멀티테넌시 검증', () => {

  test('TC-1: 앱 로드 확인', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    await expect(page.locator('body')).toBeVisible();
    const title = await page.title();
    console.log(`  📌 Page title: ${title}`);
    expect(title).toBeTruthy();
  });

  test('TC-2: 체크인 페이지 로드', async ({ page }) => {
    await page.goto(BASE + '/checkin', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    await expect(page.locator('body')).toBeVisible();
    console.log(`  📌 CheckIn URL: ${page.url()}`);
  });

  test('TC-3: 관리자 페이지 접근', async ({ page }) => {
    await page.goto(BASE + '/admin', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    await expect(page.locator('body')).toBeVisible();
    console.log(`  📌 Admin URL: ${page.url()}`);
  });

  test('TC-4: 강사 페이지 접근', async ({ page }) => {
    await page.goto(BASE + '/instructor', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    await expect(page.locator('body')).toBeVisible();
    console.log(`  📌 Instructor URL: ${page.url()}`);
  });

  test('TC-5: Firestore 연결 확인', async ({ page }) => {
    const firestoreHits = [];
    page.on('request', req => {
      if (req.url().includes('firestore.googleapis.com')) {
        firestoreHits.push(req.url().substring(0, 100));
      }
    });
    await page.goto(BASE + '/checkin', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(8000);
    console.log(`  📌 Firestore requests: ${firestoreHits.length}`);
    expect(firestoreHits.length).toBeGreaterThan(0);
  });

  test('TC-6: PERMISSION_DENIED 에러 없음', async ({ page }) => {
    /** @type {string[]} */
    const criticalErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const t = msg.text();
        if (t.includes('PERMISSION_DENIED') || t.includes('Missing or insufficient permissions')) {
          criticalErrors.push(t);
        }
      }
    });
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(8000);
    console.log(`  📌 PERMISSION_DENIED errors: ${criticalErrors.length}`);
    for (const e of criticalErrors.slice(0, 3)) {
      console.log(`    ⚠️ ${e.substring(0, 150)}`);
    }
    expect(criticalErrors.length).toBe(0);
  });

});
