// Playwright script to call restorePricingV2 via browser
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('🔄 관리자앱 접속 중...');
    await page.goto('https://boksaem-yoga.web.app', { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('🔄 restorePricingV2 함수 호출 중...');
    const result = await page.evaluate(async () => {
        const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-functions.js');
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js');
        
        // Use existing Firebase app if available
        let app;
        try {
            const { getApps } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js');
            const apps = getApps();
            app = apps[0];
        } catch (e) {}
        
        if (!app) {
            app = initializeApp({
                apiKey: "AIzaSyD0F4K3qZBO8c_P5nHIMJDlD-J-Y4o_dWc",
                authDomain: "boksaem-yoga.firebaseapp.com",
                projectId: "boksaem-yoga",
                storageBucket: "boksaem-yoga.firebasestorage.app",
                messagingSenderId: "571457498702",
                appId: "1:571457498702:web:abc123"
            });
        }
        
        const functions = getFunctions(app, 'asia-northeast3');
        const restorePricing = httpsCallable(functions, 'restorePricingV2');
        const res = await restorePricing();
        return res.data;
    });
    
    console.log('✅ 결과:', JSON.stringify(result, null, 2));
    
    await browser.close();
})();
