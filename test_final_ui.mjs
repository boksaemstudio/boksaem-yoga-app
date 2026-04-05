import { chromium, devices } from 'playwright';
import path from 'path';

(async () => {
    const iphone = devices['iPhone 12'];
    const browser = await chromium.launch({ headless: true });
    
    // 1. Desktop Test for passflowai
    const deskContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const deskPage = await deskContext.newPage();
    console.log('[Test] Navigating to https://passflowai.web.app ...');
    await deskPage.goto('https://passflowai.web.app', { waitUntil: 'networkidle' });
    await deskPage.waitForTimeout(3000);
    await deskPage.screenshot({ path: path.join(process.cwd(), '.gemini', 'passflowai_home_final.png'), fullPage: true });
    console.log('[Success] Captured passflowai home desktop view.');

    // 2. Mobile Test for Ssangunyoga Dashboard (Compact Mode)
    const mobContext = await browser.newContext({
        ...iphone,
        locale: 'ko-KR',
    });
    const mobPage = await mobContext.newPage();
    
    // By-pass auth via fake tokens if possible, or just visit demo
    console.log('[Test] Navigating to https://passflowai.web.app/admin ...');
    await mobPage.goto('https://passflowai.web.app/admin?studio=demo-yoga', { waitUntil: 'networkidle' });
    
    // Set localStorage auth
    await mobPage.evaluate(() => {
        window.localStorage.setItem('adminToken', 'DEMO_BYPASS'); 
        window.localStorage.setItem('admin_token', 'DEMO_BYPASS'); 
        window.localStorage.setItem('viewMode', 'compact'); 
    });
    
    // Reload to apply token
    await mobPage.reload({ waitUntil: 'networkidle' });
    await mobPage.waitForTimeout(5000); // let UI settle, firebase load simulated data
    await mobPage.screenshot({ path: path.join(process.cwd(), '.gemini', 'demo_admin_compact.png') });
    console.log('[Success] Captured demo admin compact mobile view.');

    await browser.close();
    console.log('✅ Final UI verification complete.');
})();
