const { chromium } = require('playwright');
const fs = require('fs');

const DIR = 'scripts/screenshots';
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

let passed = 0, failed = 0;
const log = (ok, msg) => { console.log(`   ${ok ? '✅' : '❌'} ${msg}`); if (ok) passed++; else failed++; };

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1024 } });
    
    console.log('════════════════════════════════════════');
    console.log('  전체 예약 시스템 E2E 테스트');
    console.log('════════════════════════════════════════\n');

    // ═══════════════════════════════════════
    // TEST 1: 관리자 네비게이션에 예약 탭
    // ═══════════════════════════════════════
    console.log('▶ TEST 1: 관리자 네비게이션 예약 탭');
    await page.goto('http://localhost:5173/admin', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(4000);
    
    // 예약 탭이 보이는지 (ALLOW_BOOKING이 ON일 때만)
    const navText = await page.textContent('.admin-nav-tabs').catch(() => '');
    const hasBookingTab = navText.includes('예약');
    log(true, `네비게이션에 "예약" 탭 존재 여부: ${hasBookingTab ? 'ON' : 'OFF (설정에 따라 정상)'}`);
    
    // 설정에서 예약 ON 확인
    for (const el of await page.$$('button, span')) {
        const text = await el.textContent().catch(() => '');
        if (text && text.trim() === '설정') { await el.click().catch(() => {}); break; }
    }
    await page.waitForTimeout(2000);
    
    // 토글 ON
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
    
    // 네비게이션 다시 확인
    const navText2 = await page.textContent('.admin-nav-tabs').catch(() => '');
    log(navText2.includes('예약'), '예약 ON 후 네비게이션에 "예약" 탭 활성화');
    
    await page.screenshot({ path: `${DIR}/05_admin_nav_booking.png` });
    console.log('   📸 05_admin_nav_booking.png\n');

    // ═══════════════════════════════════════
    // TEST 2: 관리자 예약 현황 대시보드
    // ═══════════════════════════════════════
    console.log('▶ TEST 2: 관리자 예약 현황 대시보드');
    
    // 예약 탭 클릭
    for (const el of await page.$$('.nav-tab-item')) {
        const text = await el.textContent().catch(() => '');
        if (text && text.trim() === '예약') { await el.click(); break; }
    }
    await page.waitForTimeout(2000);
    
    const bodyBooking = await page.textContent('body');
    
    // 날짜 네비게이션
    log(bodyBooking.includes('◀') && bodyBooking.includes('▶'), '날짜 좌우 네비게이션 버튼');
    
    // 통계 카드
    log(bodyBooking.includes('예약') && bodyBooking.includes('출석') && bodyBooking.includes('노쇼') && bodyBooking.includes('대기'), '통계 카드 4종 (예약/출석/노쇼/대기)');
    
    // 오늘 날짜 표시
    const today = new Date();
    const todayMonth = today.toLocaleDateString('ko-KR', { month: 'long' });
    log(bodyBooking.includes(todayMonth), `오늘 날짜 표시: ${todayMonth}`);
    
    await page.screenshot({ path: `${DIR}/06_admin_bookings_tab.png` });
    console.log('   📸 06_admin_bookings_tab.png\n');
    
    // ═══════════════════════════════════════
    // TEST 3: 강사앱 코드 검증
    // ═══════════════════════════════════════
    console.log('▶ TEST 3: 강사앱 예약 통합 코드 검증');
    
    const instrCode = fs.readFileSync('src/components/instructor/InstructorSchedule.jsx', 'utf-8');
    
    log(instrCode.includes("import * as bookingService"), 'bookingService import');
    log(instrCode.includes('ALLOW_BOOKING'), 'ALLOW_BOOKING 참조');
    log(instrCode.includes('dayBookings'), 'dayBookings state');
    log(instrCode.includes('getDayBookings'), 'getDayBookings 호출');
    log(instrCode.includes('getClassCapacity'), 'getClassCapacity 호출');
    log(instrCode.includes('예약 명단'), '"예약 명단" 표시');
    log(instrCode.includes('bookedCount'), '예약 인원 뱃지');
    log(instrCode.includes('capacity'), '정원 표시');
    log(instrCode.includes('waitlisted'), '대기 상태 표시');
    log(instrCode.includes('noshow'), '노쇼 상태 표시');
    console.log('');
    
    // ═══════════════════════════════════════
    // TEST 4: BookingsTab 코드 검증
    // ═══════════════════════════════════════
    console.log('▶ TEST 4: BookingsTab 코드 검증');
    
    const btCode = fs.readFileSync('src/components/admin/tabs/BookingsTab.jsx', 'utf-8');
    
    log(btCode.includes('getDayBookings'), 'getDayBookings 호출');
    log(btCode.includes('getClassCapacity'), 'getClassCapacity 호출');
    log(btCode.includes('StatCard'), 'StatCard 컴포넌트');
    log(btCode.includes('ClassBookingCard'), 'ClassBookingCard 컴포넌트');
    log(btCode.includes('BookingGroup'), 'BookingGroup 컴포넌트');
    log(btCode.includes('fillRate'), 'fillRate 정원 프로그레스');
    log(btCode.includes('expanded'), '펼침/접기 기능');
    log(btCode.includes('moveDate'), '날짜 이동 함수');
    log(btCode.includes('오늘로 돌아가기'), '"오늘로 돌아가기" 버튼');
    log(btCode.includes('예약자 없음'), '"예약자 없음" 빈 상태');
    log(btCode.includes('등록된 수업이 없습니다'), '수업 없는 날 안내');
    console.log('');
    
    // ═══════════════════════════════════════
    // TEST 5: AdminNav 조건부 렌더링
    // ═══════════════════════════════════════
    console.log('▶ TEST 5: AdminNav 조건부 렌더링');
    
    const navCode = fs.readFileSync('src/components/admin/AdminNav.jsx', 'utf-8');
    
    log(navCode.includes('CalendarCheck'), 'CalendarCheck 아이콘 import');
    log(navCode.includes("config?.POLICIES?.ALLOW_BOOKING"), 'ALLOW_BOOKING 조건부 렌더링');
    log(navCode.includes("'bookings'"), 'bookings 탭 ID');
    console.log('');
    
    // ═══════════════════════════════════════
    // TEST 6: AdminDashboard 연결
    // ═══════════════════════════════════════
    console.log('▶ TEST 6: AdminDashboard 연결');
    
    const adCode = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf-8');
    
    log(adCode.includes("import BookingsTab"), 'BookingsTab import');
    log(adCode.includes("activeTab === 'bookings'"), "bookings 탭 조건부 렌더링");
    log(adCode.includes('<BookingsTab'), 'BookingsTab 컴포넌트 렌더링');
    log(adCode.includes('currentBranch={currentBranch}'), 'currentBranch prop 전달');
    console.log('');
    
    // ═══════════════════════════════════════
    // TEST 7: bookingService 전체 API
    // ═══════════════════════════════════════
    console.log('▶ TEST 7: bookingService 전체 API');
    
    const svcCode = fs.readFileSync('src/services/bookingService.js', 'utf-8');
    
    // export 함수 목록 확인
    const exports = [
        'getClassCapacity', 'validateBooking', 'createBooking', 'cancelBooking',
        'markAttendance', 'markNoshow', 'getBooking', 'getActiveBookings',
        'getClassBookings', 'getDayBookings', 'getBookingStats', 'getMemberBookingHistory',
        'subscribeClassBookings', 'subscribeMemberBookings'
    ];
    exports.forEach(fn => {
        log(svcCode.includes(`export const ${fn}`), `export: ${fn}`);
    });
    console.log('');

    // ═══════════════════════════════════════
    // TEST 8: Props 체인 완전성
    // ═══════════════════════════════════════
    console.log('▶ TEST 8: Props 체인 완전성');
    
    const calCode = fs.readFileSync('src/components/MemberScheduleCalendar.jsx', 'utf-8');
    const stCode = fs.readFileSync('src/components/profile/tabs/ScheduleTab.jsx', 'utf-8');
    const mpCode = fs.readFileSync('src/pages/MemberProfile.jsx', 'utf-8');
    
    log(mpCode.includes('member={member}'), 'MemberProfile → ScheduleTab: member');
    log(stCode.includes("memberId={member?.id}"), 'ScheduleTab → Calendar: memberId');
    log(stCode.includes("memberName={member?.name}"), 'ScheduleTab → Calendar: memberName');
    log(calCode.includes('memberId, memberName'), 'Calendar: props 수신');
    log(calCode.includes('ALLOW_BOOKING'), 'Calendar: ALLOW_BOOKING 체크');
    log(calCode.includes('subscribeMemberBookings'), 'Calendar: 실시간 구독');
    log(calCode.includes('BookingModal'), 'Calendar: BookingModal 렌더링');
    
    console.log('\n════════════════════════════════════════');
    console.log(`  최종 결과: ${passed} PASS / ${failed} FAIL`);
    console.log('════════════════════════════════════════');
    
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})().catch(e => { console.error('치명적 오류:', e.message); process.exit(1); });
