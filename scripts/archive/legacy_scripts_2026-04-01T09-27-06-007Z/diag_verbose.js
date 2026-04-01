import { chromium } from 'playwright';

(async () => {
    console.log('--- VERBOSE 2789 + 5454 CHECK-IN DIAGNOSTIC ---');
    
    const browser = await chromium.launch({ headless: true });
    
    for (const pin of ['1234', '2789', '5454']) {
        console.log(`\n${'='.repeat(60)}\n▶️ Testing PIN: ${pin}\n${'='.repeat(60)}`);
        const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
        
        // Capture ALL console messages - no filter
        page.on('console', msg => {
            const text = msg.text();
            const type = msg.type();
            if (type === 'error' || type === 'warn' || 
                text.includes('CheckIn') || text.includes('member') || 
                text.includes('attendance') || text.includes('checkIn') ||
                text.includes('Cloud Function') || text.includes('findMember') ||
                text.includes('phone') || text.includes('timeout') ||
                text.includes('offline') || text.includes('Force') ||
                text.includes('SaaS') || text.includes('Auth') ||
                text.includes('anonymous') || text.includes(pin)) {
                console.log(`  [${type.toUpperCase().padEnd(5)}] ${text.substring(0, 300)}`);
            }
        });
        
        page.on('pageerror', err => console.log(`  [CRASH] ${err.message}`));
        
        try {
            await page.goto('https://boksaem-yoga.web.app/', { waitUntil: 'domcontentloaded', timeout: 15000 });
            
            // Wait for app to fully initialize (auth + storageService)
            await page.waitForTimeout(4000);
            console.log(`  [TEST] App loaded, entering PIN ${pin}...`);
            
            const digits = pin.split('');
            for (const d of digits) {
                await page.locator(`button.keypad-btn:has-text("${d}")`).first().click();
                await page.waitForTimeout(150);
            }
            
            console.log(`  [TEST] PIN entered, waiting 8 seconds for response...`);
            await page.waitForTimeout(8000);
            
            // Check what's visible
            const bodyText = await page.evaluate(() => document.body.innerText);
            
            if (bodyText.includes('출석되었습니다')) {
                console.log(`  ✅ CHECK-IN SUCCESS for ${pin}!`);
            } else if (bodyText.includes('회원 정보를 찾을 수 없습니다')) {
                console.log(`  ❌ MEMBER NOT FOUND for ${pin}`);
            } else if (bodyText.includes('만료')) {
                console.log(`  ⚠️ MEMBERSHIP EXPIRED for ${pin}`);
            } else if (bodyText.includes('출석 확인 중')) {
                console.log(`  ⏳ STILL LOADING for ${pin} (timeout?)`);
            } else {
                // Check if we're back at keypad with pin shown
                const hasPin = bodyText.includes(pin.split('').join(' '));
                console.log(`  ❓ UNKNOWN STATE for ${pin}. PIN visible: ${hasPin}`);
                console.log(`  Page text (first 200): ${bodyText.substring(0, 200).replace(/\n/g, ' | ')}`);
            }
            
            await page.screenshot({ path: `diag_${pin}.png` });
        } catch (e) {
            console.error(`  [FAIL] ${e.message}`);
        } finally {
            await page.close();
        }
    }

    await browser.close();
    console.log('\n--- DIAGNOSTIC COMPLETE ---');
})();
