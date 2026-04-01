const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\boksoon\\.gemini\\antigravity\\brain\\d550a6af-6fcb-4bac-9519-6655803b905e';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    
    const errors = [];
    page.on('pageerror', err => errors.push(`[JS Error] ${err.message}`));
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(`[Console Error] ${msg.text()}`);
    });

    try {
        // 1. 메인 키오스크 페이지 테스트
        console.log('🔍 [1/4] 키오스크 페이지 로드 중...');
        await page.goto('http://localhost:5174/', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_01_checkin.png'), fullPage: true });
        
        const title = await page.title();
        console.log(`   └ 페이지 제목: ${title}`);
        
        // 키패드 존재 확인
        const hasKeypad = await page.$('.keypad, .pin-input, [class*="keypad"], [class*="Keypad"]');
        console.log(`   └ 키패드 존재: ${hasKeypad ? '✅' : '❌'}`);
        
        // 2. 관리자 대시보드 테스트
        console.log('🔍 [2/4] 관리자 대시보드 로드 중...');
        await page.goto('http://localhost:5174/admin', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(5000); // Firebase 데이터 로드 대기
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_02_admin.png'), fullPage: true });
        
        // 회원 수 확인
        const bodyText = await page.textContent('body');
        const hasMemberData = bodyText.includes('명') || bodyText.includes('회원') || bodyText.includes('member');
        console.log(`   └ 회원 데이터 존재: ${hasMemberData ? '✅' : '⚠️ 데이터 없음'}`);
        
        // 에러 메시지 확인
        const hasError = bodyText.includes('에러') || bodyText.includes('Error') || bodyText.includes('오류');
        console.log(`   └ 에러 메시지: ${hasError ? '⚠️ 발견' : '✅ 없음'}`);
        
        // 3. 회원 탭 테스트
        console.log('🔍 [3/4] 회원 탭 클릭 시도...');
        const memberTab = await page.$('button:has-text("회원"), [class*="tab"]:has-text("회원")');
        if (memberTab) {
            await memberTab.click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_03_members.png'), fullPage: true });
            console.log('   └ 회원 탭 스크린샷 저장 완료');
        } else {
            console.log('   └ 회원 탭 찾지 못함 (이미 보이는 중일 수 있음)');
        }

        // 4. 시간표 페이지 테스트
        console.log('🔍 [4/4] 시간표 탭 클릭 시도...');
        const scheduleTab = await page.$('button:has-text("시간표"), [class*="tab"]:has-text("시간표")');
        if (scheduleTab) {
            await scheduleTab.click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_04_schedule.png'), fullPage: true });
            console.log('   └ 시간표 스크린샷 저장 완료');
        }

        // 결과 요약
        console.log('\n=== 📋 검증 결과 요약 ===');
        console.log(`총 JS 에러: ${errors.length}건`);
        if (errors.length > 0) {
            console.log('에러 목록 (최대 10건):');
            errors.slice(0, 10).forEach(e => console.log(`  - ${e.substring(0, 150)}`));
        }
        
        // Firebase 관련 에러 필터
        const firebaseErrors = errors.filter(e => 
            e.includes('Firestore') || e.includes('firebase') || e.includes('Firebase') || e.includes('PERMISSION')
        );
        console.log(`Firebase 관련 에러: ${firebaseErrors.length}건`);
        if (firebaseErrors.length > 0) {
            firebaseErrors.forEach(e => console.log(`  🔥 ${e.substring(0, 200)}`));
        }
        
        console.log('\n✅ 검증 스크립트 완료. 스크린샷 4장 저장됨.');
        
    } catch (err) {
        console.error('❌ 테스트 중 오류:', err.message);
    } finally {
        await browser.close();
    }
})();
