const { chromium, devices } = require('playwright');
const path = require('path');

(async () => {
    try {
        console.log("Launching browser and starting local proxy/dev server if needed, but we can test against localhost if we run 'npm run preview'...");
        
        // We'll just run a quick server for the current dist
        const { exec } = require('child_process');
        const fs = require('fs');
        
        const preview = exec('npm run preview -- --port 4173');
        await new Promise(r => setTimeout(r, 4000)); // wait for preview to boot
        
        const browser = await chromium.launch({ headless: true });
        
        // --- 1. Desktop Test ---
        console.log("Testing Desktop AI Assistant (Typing Long Text)...");
        const p1 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        await p1.goto('http://localhost:4173/admin?studio=demo-yoga', { waitUntil: 'load', timeout: 30000 });
        await p1.evaluate(() => {
            window.localStorage.setItem('adminToken', 'DEMO_BYPASS'); 
            window.localStorage.setItem('viewMode', 'full'); // desktop
        });
        await p1.reload({ waitUntil: 'load' });
        
        // Wait for AI Assistant tab to be visible or click it
        // Actually we need to click the AI Assistant tab
        await p1.waitForSelector('text="AI 비서"');
        await p1.click('text="AI 비서"');
        await p1.waitForTimeout(1000);
        
        // Type a long text sequence
        const longText = "안녕하세요, 이 텍스트는 매우 길게 작성되어서 텍스트 에어리어가 여러 줄로 확장되어야 합니다. 과연 화면 밖으로 밀려나지 않고 잘 보이는지 테스트를 진행하고 있습니다. 이정도 길이면 화면 밖으로 나갈수도 있겠죠?";
        await p1.fill('textarea[placeholder*="질문을 입력하세요"]', longText);
        await p1.waitForTimeout(500);
        await p1.screenshot({ path: path.join('.gemini', 'ai_assistant_desktop_typing.png') });

        // --- 2. Mobile Test ---
        console.log("Testing Mobile AI Assistant (Typing Long Text)...");
        const ctx = await browser.newContext(devices['iPhone 12']);
        const p2 = await ctx.newPage();
        
        await p2.goto('http://localhost:4173/admin?studio=demo-yoga', { waitUntil: 'load', timeout: 30000 });
        await p2.evaluate(() => {
            window.localStorage.setItem('adminToken', 'DEMO_BYPASS'); 
            window.localStorage.setItem('viewMode', 'compact'); 
        });
        await p2.reload({ waitUntil: 'load' });
        
        // Open Mobile Menu if needed, or if AI Assistant is a bottom tab
        // Assuming AI Assistant is visible or we need to click the navigation
        // On mobile, the navigation might be a hamburger menu or bottom bar.
        // Let's just try to find "AI 비서" text
        try {
            await p2.click('text="AI 비서"');
        } catch(e) {
            // maybe in menu
            await p2.locator('.hamburger-button').click();
            await p2.waitForTimeout(500);
            await p2.click('text="AI 비서"');
        }
        await p2.waitForTimeout(1000);
        
        await p2.fill('textarea[placeholder*="질문을 입력하세요"]', longText);
        await p2.waitForTimeout(500);
        await p2.screenshot({ path: path.join('.gemini', 'ai_assistant_mobile_typing.png') });

        await browser.close();
        preview.kill();
        console.log("✅ Verification Script Success!");
    } catch (e) {
        console.error("❌ Verification Failed", e);
    }
})();
