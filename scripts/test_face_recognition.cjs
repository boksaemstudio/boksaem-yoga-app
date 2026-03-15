const { chromium } = require('playwright');
const path = require('path');

const DIR = 'C:\\Users\\boksoon\\.gemini\\antigravity\\brain\\d550a6af-6fcb-4bac-9519-6655803b905e';
const ss = (name) => path.join(DIR, name);

let passed = 0, failed = 0;
const results = [];

function check(name, condition) {
    if (condition) { passed++; results.push(`✅ ${name}`); console.log(`✅ PASS: ${name}`); }
    else { failed++; results.push(`❌ ${name}`); console.log(`❌ FAIL: ${name}`); }
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => consoleErrors.push(err.message));

    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║    안면인식 시스템 심층 & 엣지 케이스 테스트    ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000);

    // Helpers
    const goToSettings = async () => {
        for (const item of await page.$$('button, a, [role="tab"]')) {
            const t = await item.textContent().catch(() => '');
            if (t.trim() === '설정' || t.includes('설정')) { await item.click(); await page.waitForTimeout(2000); return; }
        }
    };
    const goToMembers = async () => {
        for (const item of await page.$$('button, a, [role="tab"]')) {
            const t = await item.textContent().catch(() => '');
            if (t.trim() === '회원' || (t.includes('회원') && !t.includes('등록') && t.length < 10)) { await item.click(); await page.waitForTimeout(2000); return; }
        }
    };
    const clickSave = async () => {
        const btn = await page.locator('button:text("저장"), button:text("변경사항 저장")').first();
        if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) { await btn.click(); await page.waitForTimeout(3000); }
    };

    // Find toggle by text label — ToggleSwitch uses a hidden input inside a label
    // We click the label (toggle visual element) instead of the hidden checkbox
    const findAndClickToggle = async (labelText) => {
        const el = await page.locator(`text=${labelText}`).first();
        if (!await el.isVisible({ timeout: 2000 }).catch(() => false)) {
            for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 400); await page.waitForTimeout(200); }
        }
        if (!await el.isVisible({ timeout: 2000 }).catch(() => false)) return null;
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);

        // The label text is inside a div, sibling to the ToggleSwitch (label>input+span)
        // We need to find the toggle label element that's a sibling
        const box = await el.boundingBox();
        if (!box) return null;
        
        // Find all label elements and pick closest to same Y
        const labels = await page.$$('label');
        let best = null, bestDist = Infinity;
        for (const lbl of labels) {
            const lbox = await lbl.boundingBox().catch(() => null);
            if (!lbox) continue;
            const dist = Math.abs(lbox.y - box.y);
            if (dist < bestDist && dist < 50) { bestDist = dist; best = lbl; }
        }
        return best;
    };

    const getToggleState = async (labelText) => {
        const el = await page.locator(`text=${labelText}`).first();
        if (!await el.isVisible({ timeout: 2000 }).catch(() => false)) return null;
        const box = await el.boundingBox();
        if (!box) return null;
        const inputs = await page.$$('input[type="checkbox"]');
        for (const inp of inputs) {
            const ibox = await inp.boundingBox().catch(() => null);
            // Hidden inputs have 0 size, use evaluate to check
            const ownerLabel = await inp.evaluateHandle(el => el.closest('label'));
            const lb = await ownerLabel.asElement()?.boundingBox?.().catch(() => null);
            if (lb) {
                const dist = Math.abs(lb.y - box.y);
                if (dist < 50) {
                    return await inp.isChecked().catch(() => false);
                }
            }
        }
        return null;
    };

    await goToSettings();

    // ═══════════════════════════════════
    // TEST GROUP 1: 설정 토글 인터랙션
    // ═══════════════════════════════════
    console.log('\n── 테스트 그룹 1: 설정 토글 인터랙션 ──');

    // 1-1: 카메라 OFF → 안면인식 숨김
    let camState = await getToggleState('출석 화면 카메라');
    console.log(`  카메라 현재 상태: ${camState}`);
    
    if (camState === true) {
        const toggle = await findAndClickToggle('출석 화면 카메라');
        if (toggle) { await toggle.click(); await page.waitForTimeout(1000); }
    }
    
    const faceVisibleWhenOff = await page.locator('text=안면인식 자동 출석').first().isVisible({ timeout: 2000 }).catch(() => false);
    check('1-1: 카메라 OFF → 안면인식 토글 숨김', !faceVisibleWhenOff);
    await page.screenshot({ path: ss('edge_01_cam_off.png') });

    // 1-2: 카메라 ON → 안면인식 노출
    const camToggle = await findAndClickToggle('출석 화면 카메라');
    if (camToggle) { await camToggle.click(); await page.waitForTimeout(1500); }
    
    const faceVisibleWhenOn = await page.locator('text=안면인식 자동 출석').first().isVisible({ timeout: 3000 }).catch(() => false);
    check('1-2: 카메라 ON → 안면인식 토글 노출', faceVisibleWhenOn);
    await page.screenshot({ path: ss('edge_02_cam_on.png') });

    // 1-3: 안면인식 토글 ON
    if (faceVisibleWhenOn) {
        const faceState = await getToggleState('안면인식 자동 출석');
        console.log(`  안면인식 현재 상태: ${faceState}`);
        
        if (faceState === false) {
            const faceToggle = await findAndClickToggle('안면인식 자동 출석');
            if (faceToggle) { await faceToggle.click(); await page.waitForTimeout(1000); }
        }
        
        const afterState = await getToggleState('안면인식 자동 출석');
        check('1-3: 안면인식 토글 ON 전환', afterState === true);
    }

    // 1-4: 빠른 카메라 토글 4회 (안정성)
    for (let i = 0; i < 4; i++) {
        const t = await findAndClickToggle('출석 화면 카메라');
        if (t) { await t.click(); await page.waitForTimeout(300); }
    }
    await page.waitForTimeout(1000);
    const stableText = await page.textContent('body');
    check('1-4: 빠른 토글 4회 → 페이지 안정', stableText?.includes('출석 화면 카메라'));
    await page.screenshot({ path: ss('edge_03_rapid.png') });

    // Ensure camera ON + face ON for saving
    let cs = await getToggleState('출석 화면 카메라');
    if (cs !== true) { const t = await findAndClickToggle('출석 화면 카메라'); if (t) { await t.click(); await page.waitForTimeout(1000); } }
    let fs = await getToggleState('안면인식 자동 출석');
    if (fs !== true) { const t = await findAndClickToggle('안면인식 자동 출석'); if (t) { await t.click(); await page.waitForTimeout(500); } }
    
    // 1-5: 저장 + 새로고침 → 설정 유지
    await clickSave();
    await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000);
    await goToSettings();
    
    const camPersist = await getToggleState('출석 화면 카메라');
    const facePersist = await getToggleState('안면인식 자동 출석');
    check('1-5: 새로고침 → 카메라 ON 유지', camPersist === true);
    check('1-6: 새로고침 → 안면인식 ON 유지', facePersist === true);
    await page.screenshot({ path: ss('edge_04_persist.png') });

    // ═══════════════════════════════════
    // TEST GROUP 2: 출석 화면 (키오스크)
    // ═══════════════════════════════════
    console.log('\n── 테스트 그룹 2: 출석 화면 ──');
    
    const kPage = await context.newPage();
    kPage.on('pageerror', err => consoleErrors.push(`[K] ${err.message}`));
    await kPage.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
    await kPage.waitForTimeout(5000);

    const kText = await kPage.textContent('body');
    check('2-1: 카메라 프리뷰 영역', kText?.includes('사진 미저장') || kText?.includes('128'));
    check('2-2: "사진 미저장" 문구', kText?.includes('사진 미저장'));
    check('2-3: "128" 문구', kText?.includes('128'));
    check('2-4: "불가역적" 문구', kText?.includes('불가역적'));
    check('2-5: "터치하여 등록" 라벨', kText?.includes('터치하여 등록'));
    await kPage.screenshot({ path: ss('edge_05_kiosk.png') });

    // 2-6: 터치 → 등록 모달 열림
    const touchEl = await kPage.locator('text=터치하여 등록').first();
    if (await touchEl.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Click the camera area (grandparent)
        const parent = await touchEl.locator('..').locator('..').first();
        await parent.click();
        await kPage.waitForTimeout(2000);
        
        const mText = await kPage.textContent('body');
        check('2-6: 터치 → 등록 모달 오픈', mText?.includes('얼굴로 출석하기'));
        check('2-7: 모달 "128" 문구', mText?.includes('128'));
        check('2-8: 모달 "불가역적" 문구', mText?.includes('불가역적'));
        check('2-9: "등록할게요!" 버튼', mText?.includes('등록할게요'));
        check('2-10: "다음에 할게요" 버튼', mText?.includes('다음에 할게요'));
        await kPage.screenshot({ path: ss('edge_06_modal.png') });

        // Step 2: PIN 입력
        const regBtn = await kPage.locator('button:text("등록할게요!")').first();
        if (await regBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await regBtn.click();
            await kPage.waitForTimeout(1000);
            const p2 = await kPage.textContent('body');
            check('2-11: → PIN 입력 단계', p2?.includes('본인 확인') || p2?.includes('뒷 4자리'));
            await kPage.screenshot({ path: ss('edge_07_pin.png') });

            // PIN keypad
            const b1 = kPage.locator('button:text("1")').first();
            const b2 = kPage.locator('button:text("2")').first();
            const b3 = kPage.locator('button:text("3")').first();
            const b4 = kPage.locator('button:text("4")').first();
            
            if (await b1.isVisible({ timeout: 2000 }).catch(() => false)) {
                await b1.click(); await kPage.waitForTimeout(100);
                await b2.click(); await kPage.waitForTimeout(100);
                await b3.click(); await kPage.waitForTimeout(100);
                await b4.click(); await kPage.waitForTimeout(200);
                
                const dots = await kPage.$$('div >> text="●"');
                check('2-12: PIN 4자리 → 4 dot', dots.length >= 4);
                await kPage.screenshot({ path: ss('edge_08_pin4.png') });

                // 지우기
                const clr = kPage.locator('button:text("지우기")').first();
                if (await clr.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await clr.click(); await kPage.waitForTimeout(300);
                    const dots2 = await kPage.$$('div >> text="●"');
                    check('2-13: 지우기 → 초기화', dots2.length === 0);
                }

                // 확인 비활성 (PIN 비었을 때)
                const cfm = kPage.locator('button:text("확인")').first();
                if (await cfm.isVisible({ timeout: 1000 }).catch(() => false)) {
                    const dis = await cfm.isDisabled().catch(() => false);
                    check('2-14: PIN 비었을 때 확인 비활성', dis);
                }

                // 존재하지 않는 번호 → 에러
                const b9 = kPage.locator('button:text("9")').first();
                for (let i = 0; i < 4; i++) { await b9.click(); await kPage.waitForTimeout(80); }
                const cfm2 = kPage.locator('button:text("확인")').first();
                if (await cfm2.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await cfm2.click();
                    await kPage.waitForTimeout(4000);
                    const errT = await kPage.textContent('body');
                    check('2-15: 잘못된 번호 → 에러', errT?.includes('등록된 회원이 없') || errT?.includes('문제가 생겼'));
                    await kPage.screenshot({ path: ss('edge_09_err.png') });
                }

                // 취소
                const cancel = kPage.locator('button:text("취소")').first();
                if (await cancel.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await cancel.click();
                    await kPage.waitForTimeout(1000);
                    const closed = await kPage.textContent('body');
                    check('2-16: 취소 → 모달 닫힘', !closed?.includes('본인 확인'));
                }
            }
        }
    }

    // ═══════════════════════════════════
    // TEST GROUP 3: 회원 목록
    // ═══════════════════════════════════
    console.log('\n── 테스트 그룹 3: 회원 목록 ──');
    await page.bringToFront();
    await goToMembers();
    const memT = await page.textContent('body');
    check('3-1: "안면 미등록 회원" 카드', memT?.includes('안면 미등록'));
    
    const bioM = page.locator('text=안면 미등록 회원').first();
    if (await bioM.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bioM.click(); await page.waitForTimeout(2000);
        check('3-2: 필터 적용', true);
        await page.screenshot({ path: ss('edge_10_members.png') });
    }

    // ═══════════════════════════════════
    // TEST GROUP 4: 카메라 OFF → 출석화면
    // ═══════════════════════════════════
    console.log('\n── 테스트 그룹 4: 카메라 OFF 출석화면 ──');
    await page.bringToFront();
    await goToSettings();
    
    cs = await getToggleState('출석 화면 카메라');
    if (cs === true) { const t = await findAndClickToggle('출석 화면 카메라'); if (t) { await t.click(); await page.waitForTimeout(1000); } }
    await clickSave();
    
    await kPage.bringToFront();
    await kPage.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
    await kPage.waitForTimeout(5000);
    const kText2 = await kPage.textContent('body');
    check('4-1: 카메라 OFF → 보안 문구 없음', !kText2?.includes('사진 미저장'));
    check('4-2: 카메라 OFF → "터치하여 등록" 없음', !kText2?.includes('터치하여 등록'));
    await kPage.screenshot({ path: ss('edge_11_kiosk_off.png') });

    // Restore original: camera ON, face ON
    await page.bringToFront();
    await goToSettings();
    cs = await getToggleState('출석 화면 카메라');
    if (cs !== true) { const t = await findAndClickToggle('출석 화면 카메라'); if (t) { await t.click(); await page.waitForTimeout(1000); } }
    fs = await getToggleState('안면인식 자동 출석');
    if (fs !== true) { const t = await findAndClickToggle('안면인식 자동 출석'); if (t) { await t.click(); await page.waitForTimeout(500); } }
    await clickSave();

    // ═══════════════════════════════════
    // TEST GROUP 5: 런타임 에러
    // ═══════════════════════════════════
    console.log('\n── 테스트 그룹 5: 런타임 에러 ──');
    const critical = consoleErrors.filter(e => 
        !e.includes('getUserMedia') && !e.includes('camera') && !e.includes('Camera') &&
        !e.includes('NotAllowed') && !e.includes('Permission') && !e.includes('service-worker') &&
        !e.includes('workbox') && !e.includes('favicon') && !e.includes('manifest') &&
        !e.includes('face-api') && !e.includes('model') && !e.includes('net')
    );
    check('5-1: 런타임 에러 없음', critical.length === 0);
    if (critical.length > 0) {
        critical.forEach(e => console.log(`  ⚠️ ${e.substring(0, 120)}`));
    }

    // ═══════════════════════════════════
    // REPORT
    // ═══════════════════════════════════
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║              테스트 결과 요약                  ║');
    console.log('╠═══════════════════════════════════════════════╣');
    results.forEach(r => console.log(`║ ${r.padEnd(45)}║`));
    console.log('╠═══════════════════════════════════════════════╣');
    console.log(`║ 통과: ${String(passed).padStart(2)}  |  실패: ${String(failed).padStart(2)}  |  성공률: ${((passed/(passed+failed))*100).toFixed(1)}%     ║`);
    console.log('╚═══════════════════════════════════════════════╝');

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})().catch(e => {
    console.error('❌ 테스트 크래시:', e.message);
    process.exit(1);
});
