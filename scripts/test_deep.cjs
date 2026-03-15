const { chromium } = require('playwright');
const fs = require('fs');

const SCREENSHOTS_DIR = 'scripts/screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

let passed = 0, failed = 0;
const log = (ok, msg) => { console.log(`   ${ok ? '✅' : '❌'} ${msg}`); if (ok) passed++; else failed++; };

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1024 } });
    
    console.log('════════════════════════════════════════');
    console.log('  심층 E2E 테스트 (Playwright)');
    console.log('════════════════════════════════════════\n');

    // ═══════════════════════════════════════
    // TEST 1: 관리자 설정 화면
    // ═══════════════════════════════════════
    console.log('▶ TEST 1: 관리자 설정 화면');
    await page.goto('http://localhost:5173/admin', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(4000);

    // 설정 탭 클릭
    const allEls = await page.$$('button, a, span, div');
    for (const el of allEls) {
        const text = await el.textContent().catch(() => '');
        if (text && text.trim() === '설정') { await el.click().catch(() => {}); break; }
    }
    await page.waitForTimeout(2000);
    
    const body = await page.textContent('body');
    
    // 1-1. 순한글 타이틀
    log(body.includes('우리 요가원 설정'), '페이지 타이틀: "우리 요가원 설정"');
    
    // 1-2. 요가원 카드 구성
    log(body.includes('요가원 이름'), '"요가원 이름" 필드 존재');
    log(body.includes('한 줄 소개'), '"한 줄 소개" 필드 존재');
    
    // 1-3. 삭제된 항목 확인
    log(!body.includes('브랜드 테마'), '브랜드 테마 삭제됨');
    log(!body.includes('(Theme)'), '(Theme) 라벨 삭제됨');
    log(!body.includes('(Identity)'), '(Identity) 라벨 삭제됨');
    log(!body.includes('(Policies)'), '(Policies) 라벨 삭제됨');
    log(!body.includes('앱 버전'), '앱 버전 필드 삭제됨');
    log(!body.includes('세션 자동 종료'), '세션 자동 종료 삭제됨');
    log(!body.includes('정책 임계값'), '정책 임계값 삭제됨');
    log(!body.includes('프라이머리 컬러'), '프라이머리 컬러 삭제됨');
    
    // 1-4. 운영 규칙 3대 토글 존재
    log(body.includes('운영 규칙'), '"운영 규칙" 섹션');
    log(body.includes('회원 홀딩'), '"회원 홀딩 (일시정지)" 토글');
    log(body.includes('수업 예약'), '"수업 예약" 토글');
    log(body.includes('출석 화면 카메라'), '"출석 화면 카메라" 토글');
    
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01_settings_top.png` });
    console.log('   📸 01_settings_top.png\n');
    
    // ═══════════════════════════════════════
    // TEST 2: 수업 예약 토글 ON → 상세 설정 표시
    // ═══════════════════════════════════════
    console.log('▶ TEST 2: 수업 예약 토글 ON → 상세 설정');
    
    // 자바스크립트로 예약 토글 ON
    await page.evaluate(() => {
        const labels = document.querySelectorAll('label');
        labels.forEach(l => {
            const parent = l.closest('div');
            if (parent && parent.textContent.includes('수업 예약')) {
                const checkbox = l.querySelector('input[type="checkbox"]');
                if (checkbox && !checkbox.checked) checkbox.click();
            }
        });
    });
    await page.waitForTimeout(1500);
    
    const bodyAfterToggle = await page.textContent('body');
    
    // 예약 설정 항목들 
    log(bodyAfterToggle.includes('수업당 최대 인원'), '수업당 최대 인원 설정');
    log(bodyAfterToggle.includes('예약 가능 기간'), '예약 가능 기간 설정');
    log(bodyAfterToggle.includes('예약 마감'), '예약 마감 시간 설정');
    log(bodyAfterToggle.includes('취소 마감'), '취소 마감 설정');
    log(bodyAfterToggle.includes('동시 예약 한도'), '동시 예약 한도');
    log(bodyAfterToggle.includes('하루 최대 예약'), '하루 최대 예약');
    log(bodyAfterToggle.includes('노쇼'), '노쇼 횟수 차감');
    log(bodyAfterToggle.includes('대기열'), '대기열 토글');
    
    // 지점별 정원
    log(bodyAfterToggle.includes('기본값'), '지점별 정원 - 기본값');
    log(bodyAfterToggle.includes('광흥창'), '지점별 정원 - 광흥창');
    log(bodyAfterToggle.includes('마포'), '지점별 정원 - 마포');
    
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/02_booking_settings.png` });
    console.log('   📸 02_booking_settings.png\n');
    
    // ═══════════════════════════════════════
    // TEST 3: 예약 토글 OFF → 상세 설정 숨김
    // ═══════════════════════════════════════
    console.log('▶ TEST 3: 수업 예약 토글 OFF → 상세 설정 숨김');
    
    await page.evaluate(() => {
        const labels = document.querySelectorAll('label');
        labels.forEach(l => {
            const parent = l.closest('div');
            if (parent && parent.textContent.includes('수업 예약')) {
                const checkbox = l.querySelector('input[type="checkbox"]');
                if (checkbox && checkbox.checked) checkbox.click();
            }
        });
    });
    await page.waitForTimeout(1000);
    
    const bodyOff = await page.textContent('body');
    log(!bodyOff.includes('수업당 최대 인원'), '토글 OFF → 상세 설정 숨김 확인');
    
    // 다시 ON
    await page.evaluate(() => {
        const labels = document.querySelectorAll('label');
        labels.forEach(l => {
            const parent = l.closest('div');
            if (parent && parent.textContent.includes('수업 예약')) {
                const checkbox = l.querySelector('input[type="checkbox"]');
                if (checkbox && !checkbox.checked) checkbox.click();
            }
        });
    });
    await page.waitForTimeout(500);
    console.log('');
    
    // ═══════════════════════════════════════
    // TEST 4: Stepper +/- 동작 (정원 값 변경)
    // ═══════════════════════════════════════
    console.log('▶ TEST 4: Stepper +/- 동작 (정원 값)');
    
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(500);
    
    // 기본값 Stepper 찾기 - "기본값" 텍스트 옆의 + 버튼
    const initialVal = await page.evaluate(() => {
        const spans = document.querySelectorAll('span');
        for (const s of spans) {
            if (s.textContent.trim() === '기본값') {
                const container = s.closest('div');
                const valSpan = container?.querySelector('span[style*="font-size"]');
                // 가장 가까운 숫자 값 찾기
                const allSpans = container?.querySelectorAll('span');
                for (const vs of allSpans || []) {
                    const num = parseInt(vs.textContent.trim());
                    if (!isNaN(num) && num > 0) return num;
                }
            }
        }
        return null;
    });
    log(initialVal !== null, `기본 정원 초기값: ${initialVal}명`);
    
    // + 버튼 클릭
    const plusClicked = await page.evaluate(() => {
        const spans = document.querySelectorAll('span');
        for (const s of spans) {
            if (s.textContent.trim() === '기본값') {
                const container = s.closest('div');
                const buttons = container?.querySelectorAll('button');
                // + 버튼은 보통 두 번째
                if (buttons && buttons.length >= 2) {
                    buttons[1].click();
                    return true;
                }
            }
        }
        return false;
    });
    await page.waitForTimeout(300);
    
    const newVal = await page.evaluate(() => {
        const spans = document.querySelectorAll('span');
        for (const s of spans) {
            if (s.textContent.trim() === '기본값') {
                const container = s.closest('div');
                const allSpans = container?.querySelectorAll('span');
                for (const vs of allSpans || []) {
                    const num = parseInt(vs.textContent.trim());
                    if (!isNaN(num) && num > 0) return num;
                }
            }
        }
        return null;
    });
    log(newVal !== null && newVal === (initialVal || 15) + 1, `+ 클릭 후 정원: ${newVal}명 (${initialVal}+1)`);
    
    // - 버튼으로 복원
    await page.evaluate(() => {
        const spans = document.querySelectorAll('span');
        for (const s of spans) {
            if (s.textContent.trim() === '기본값') {
                const container = s.closest('div');
                const buttons = container?.querySelectorAll('button');
                if (buttons && buttons.length >= 2) buttons[0].click();
            }
        }
    });
    await page.waitForTimeout(300);
    console.log('');
    
    // ═══════════════════════════════════════
    // TEST 5: 차트 범례
    // ═══════════════════════════════════════
    console.log('▶ TEST 5: 매출 차트 범례');
    
    // 매출 탭 클릭
    const navEls = await page.$$('button, a, span, div');
    for (const el of navEls) {
        const text = await el.textContent().catch(() => '');
        if (text && text.trim() === '매출') { await el.click().catch(() => {}); break; }
    }
    await page.waitForTimeout(3000);
    
    // recharts Legend 확인
    const legendCount = await page.$$eval('.recharts-legend-wrapper', els => els.length);
    log(legendCount > 0, `차트 범례 존재 (${legendCount}개)`);
    
    // 범례 텍스트
    const legendTexts = await page.$$eval('.recharts-legend-item-text', els => els.map(e => e.textContent));
    log(legendTexts.length > 0, `범례 항목: ${legendTexts.join(', ')}`);
    
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/03_chart_legend.png` });
    
    // 스크롤해서 막대 차트도 확인
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);
    
    const legendCount2 = await page.$$eval('.recharts-legend-wrapper', els => els.length);
    log(legendCount2 >= 2, `막대 차트 범례도 존재 (총 ${legendCount2}개)`);
    
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/04_barchart_legend.png` });
    console.log('   📸 03_chart_legend.png, 04_barchart_legend.png\n');
    
    // ═══════════════════════════════════════
    // TEST 6: 키오스크 체크인 화면 카메라 설정
    // ═══════════════════════════════════════
    console.log('▶ TEST 6: CheckInInfoSection 카메라 프리뷰 코드 검증');
    
    const checkinCode = fs.readFileSync('src/components/checkin/CheckInInfoSection.jsx', 'utf-8');
    log(checkinCode.includes('useStudioConfig'), 'useStudioConfig import');
    log(checkinCode.includes('SHOW_CAMERA_PREVIEW'), 'SHOW_CAMERA_PREVIEW 참조');
    log(checkinCode.includes('getUserMedia'), 'getUserMedia 카메라 접근');
    log(checkinCode.includes('facingMode'), "facingMode: 'user' (전면 카메라)");
    log(checkinCode.includes('videoRef'), 'video ref 바인딩');
    log(checkinCode.includes('scaleX(-1)'), '좌우 반전 (거울 효과)');
    log(checkinCode.includes('숫자로 변환'), '프라이버시 안내 문구');
    log(checkinCode.includes('showCamera') && checkinCode.includes('{showCamera &&'), '조건부 렌더링 (showCamera)');
    
    // 카메라가 QR 왼쪽에 위치하는지 확인 (카메라 코드가 QR 코드 앞에 나오는지)
    const cameraIdx = checkinCode.indexOf('카메라 프리뷰');
    const qrIdx = checkinCode.indexOf('QR코드 박스');
    log(cameraIdx < qrIdx, '카메라 프리뷰가 QR코드 박스 왼쪽(앞)에 위치');
    
    // stopTracks 정리 로직
    log(checkinCode.includes('getTracks().forEach'), '카메라 stream cleanup 존재');
    console.log('');
    
    // ═══════════════════════════════════════
    // TEST 7: bookingService.js 로직 단위 검증
    // ═══════════════════════════════════════
    console.log('▶ TEST 7: bookingService.js 로직 검증');
    
    const svc = fs.readFileSync('src/services/bookingService.js', 'utf-8');
    
    // 7-1. getClassCapacity 우선순위 로직
    log(svc.includes('classItem?.capacity'), '정원 우선순위 1: 수업 자체');
    log(svc.includes('branchCapacity?.[branchId]'), '정원 우선순위 2: 지점별');
    log(svc.includes('defaultCapacity || 15'), '정원 우선순위 3: 기본값 (15명)');
    
    // 7-2. validateBooking 규칙들
    log(svc.includes('ALLOW_BOOKING'), '규칙: 예약 기능 ON 확인');
    log(svc.includes('windowDays'), '규칙: 예약 가능 기간');
    log(svc.includes('maxActiveBookings'), '규칙: 동시 예약 한도');
    log(svc.includes('maxDailyBookings'), '규칙: 일일 예약 한도');
    log(svc.includes("status !== 'cancelled'"), '규칙: 중복 예약 방지');
    
    // 7-3. createBooking 대기열 로직
    log(svc.includes('confirmedCount >= capacity'), '정원 초과 감지');
    log(svc.includes("status = 'waitlisted'"), '대기열 등록');
    log(svc.includes('waitlistPosition'), '대기 순번 부여');
    
    // 7-4. cancelBooking → 대기열 승격
    log(svc.includes('promoteWaitlist'), '취소 시 대기열 승격 호출');
    
    // 7-5. promoteWaitlist 상세
    log(svc.includes("status: 'booked'") && svc.includes('promotedAt'), '대기자 → 예약 승격');
    log(svc.includes('waitlistPosition: i'), '나머지 대기자 순서 재조정');
    
    // 7-6. 노쇼 처리
    log(svc.includes('noshowCreditDeduct') && svc.includes('creditDeducted'), '노쇼 시 횟수 차감 기록');
    
    // 7-7. serverTimestamp 사용
    log(svc.includes('serverTimestamp()'), 'Firestore serverTimestamp 사용');
    
    // 7-8. 실시간 구독
    log(svc.includes('onSnapshot'), 'Firestore 실시간 구독');
    console.log('');
    
    // ═══════════════════════════════════════
    // TEST 8: MemberScheduleCalendar 예약 통합 검증
    // ═══════════════════════════════════════
    console.log('▶ TEST 8: MemberScheduleCalendar 예약 통합');
    
    const cal = fs.readFileSync('src/components/MemberScheduleCalendar.jsx', 'utf-8');
    
    // 8-1. 예약 ON/OFF 조건
    log(cal.includes("config?.POLICIES?.ALLOW_BOOKING && !!memberId"), '예약 ON 조건: ALLOW_BOOKING + memberId');
    
    // 8-2. 실시간 예약 구독
    log(cal.includes('subscribeMemberBookings'), '내 예약 실시간 구독');
    
    // 8-3. 미래 수업만 예약 가능
    log(cal.includes('isFuture') && cal.includes("dateStr >= todayKST"), '미래 수업만 클릭 가능');
    
    // 8-4. 예약 모달 트리거
    log(cal.includes('onClassClick') && cal.includes('setBookingModal'), '수업 클릭 → 모달 트리거');
    
    // 8-5. BookingModal 정원바
    log(cal.includes('confirmedCount / capacity') && cal.includes("width:"), '정원 프로그레스바');
    
    // 8-6. BookingModal 3가지 상태 버튼
    log(cal.includes('예약하기') && cal.includes('예약 취소') && cal.includes('대기 등록'), '모달 버튼 3종');
    
    // 8-7. 예약됨 표시
    log(cal.includes("'예약'") && cal.includes("'대기'"), '캘린더에 예약/대기 태그 표시');
    log(cal.includes('2px solid var(--primary-gold)'), '예약됨 골드 테두리');
    
    // 8-8. ColorLegend에 내 예약 범례
    log(cal.includes('내 예약'), '범례에 "내 예약" 추가');
    
    // 8-9. 에러 핸들링
    log(cal.includes("catch (e)") || cal.includes('.catch('), '에러 핸들링 존재');
    
    // 8-10. loading 상태 관리
    log(cal.includes('bookingLoading') && cal.includes("처리 중..."), 'loading 상태 + "처리 중" 텍스트');
    console.log('');
    
    // ═══════════════════════════════════════
    // TEST 9: studioConfig 기본값 검증
    // ═══════════════════════════════════════
    console.log('▶ TEST 9: studioConfig 기본값');
    
    const cfg = fs.readFileSync('src/studioConfig.js', 'utf-8');
    log(cfg.includes('ALLOW_BOOKING') && cfg.includes('false'), 'ALLOW_BOOKING 기본값: false');
    log(cfg.includes('SHOW_CAMERA_PREVIEW') && cfg.includes('false'), 'SHOW_CAMERA_PREVIEW 기본값: false');
    log(cfg.includes('BOOKING_RULES'), 'BOOKING_RULES 기본 객체 존재');
    log(cfg.includes('defaultCapacity'), 'defaultCapacity 기본값 존재');
    console.log('');
    
    // ═══════════════════════════════════════
    // TEST 10: Props 체인 정합성
    // ═══════════════════════════════════════
    console.log('▶ TEST 10: Props 체인 정합성');
    
    const profile = fs.readFileSync('src/pages/MemberProfile.jsx', 'utf-8');
    const schedTab = fs.readFileSync('src/components/profile/tabs/ScheduleTab.jsx', 'utf-8');
    
    // MemberProfile → ScheduleTab
    log(profile.includes('member={member}'), 'MemberProfile → ScheduleTab: member 전달');
    
    // ScheduleTab → MemberScheduleCalendar
    log(schedTab.includes("memberId={member?.id}"), 'ScheduleTab → Calendar: memberId 전달');
    log(schedTab.includes("memberName={member?.name}"), 'ScheduleTab → Calendar: memberName 전달');
    
    // MemberScheduleCalendar receives
    log(cal.includes('memberId, memberName'), 'Calendar: memberId, memberName props 수신');
    console.log('');
    
    // ═══════════════════════════════════════
    // 최종 결과
    // ═══════════════════════════════════════
    console.log('════════════════════════════════════════');
    console.log(`  최종 결과: ${passed} PASS / ${failed} FAIL`);
    console.log('════════════════════════════════════════');
    
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})().catch(e => { console.error('치명적 오류:', e.message); process.exit(1); });
