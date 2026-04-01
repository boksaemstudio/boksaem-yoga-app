const fs = require('fs');

console.log('=== 회원앱 예약 UI 코드 검증 ===\n');
let passed = 0, failed = 0;

const check = (name, file, pattern) => {
    const content = fs.readFileSync(file, 'utf-8');
    const ok = content.includes(pattern);
    console.log(`   ${ok ? '✅' : '❌'} ${name}`);
    if (ok) passed++; else failed++;
    return ok;
};

// 1. MemberProfile.jsx - member prop 전달
console.log('1. MemberProfile.jsx');
check('ScheduleTab에 member prop 전달', 'src/pages/MemberProfile.jsx', 'member={member}');

// 2. ScheduleTab.jsx - member prop 수신 및 전달
console.log('\n2. ScheduleTab.jsx');
check('member prop 수신', 'src/components/profile/tabs/ScheduleTab.jsx', 'member');
check('MemberScheduleCalendar에 memberId 전달', 'src/components/profile/tabs/ScheduleTab.jsx', 'memberId={member?.id}');
check('MemberScheduleCalendar에 memberName 전달', 'src/components/profile/tabs/ScheduleTab.jsx', 'memberName={member?.name}');

// 3. MemberScheduleCalendar.jsx - 예약 기능 통합
console.log('\n3. MemberScheduleCalendar.jsx');
const cal = 'src/components/MemberScheduleCalendar.jsx';
check('bookingService import', cal, "import * as bookingService from '../services/bookingService'");
check('useStudioConfig import', cal, "import { useStudioConfig }");
check('memberId prop', cal, 'memberId');
check('memberName prop', cal, 'memberName');
check('ALLOW_BOOKING 확인', cal, 'ALLOW_BOOKING');
check('bookingModal state', cal, 'bookingModal');
check('subscribeMemberBookings 호출', cal, 'subscribeMemberBookings');
check('handleBookClass 함수', cal, 'handleBookClass');
check('handleCancelBooking 함수', cal, 'handleCancelBooking');
check('BookingModal 컴포넌트', cal, 'BookingModal');
check('정원 바 UI', cal, 'confirmedCount');
check('예약하기 버튼', cal, '예약하기');
check('예약 취소 버튼', cal, '예약 취소');
check('대기 등록 버튼', cal, '대기 등록');
check('myBookings 상태', cal, 'myBookings');
check('예약 태그', cal, "? '대기' : '예약'");
check('내 예약 범례', cal, '내 예약');
check('isFuture 체크 (미래 수업만)', cal, 'isFuture');

// 4. bookingService.js - 핵심 함수
console.log('\n4. bookingService.js');
const svc = 'src/services/bookingService.js';
check('createBooking 함수', svc, 'createBooking');
check('cancelBooking 함수', svc, 'cancelBooking');
check('validateBooking 함수', svc, 'validateBooking');
check('getClassCapacity 함수', svc, 'getClassCapacity');
check('promoteWaitlist 함수', svc, 'promoteWaitlist');
check('branchCapacity 지원', svc, 'branchCapacity');

console.log(`\n=== 결과: ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
