const fs = require('fs');
const file = 'c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/src/components/admin/tabs/OperationsGuideTab.jsx';
let c = fs.readFileSync(file, 'utf8');
const replacements = {
    '" rules"': '"개 규칙"',
    '"When a member\'s period has expired or remaining credits reach 0, check-in is automatically refused at the kiosk. The screen shows the reason: \'Period Expired\' or \'No Credits\'."': '"기간 만료 또는 잔여 횟수가 0인 회원이 키오스크에 출석을 시도하면 자동으로 출석이 거부됩니다. (화면에 사유 표시)"',
    '"Set the start date to \'TBD\' during registration. The first attendance day automatically becomes the start date, and the end date is calculated based on the membership duration."': '"수강권 등록 시 시작일을 \'미확정(TBD)\'으로 설정할 수 있습니다. 회원이 처음 출석하는 날이 자동으로 시작일로 지정되며, 이에 따라 종료일도 자동 계산됩니다."',
    '"Temporarily pause a membership. If the member attends during a hold, it is automatically released. The end date is extended by the actual number of paused days."': '"회원의 수강을 일시적으로 정지합니다. 정지 기간 중 출석하면 홀딩이 자동 해제되며, 정지된 일수만큼 수강 종료일이 연장됩니다."',
    '"Current rules"': '"현재 설정된 규칙"',
    '"mo"': '"개월"',
    '"wk"': '"주"',
    '"rules configured"': '"개 규칙 설정됨"',
    '"Not set"': '"설정 안 됨"',
    '"Members with remaining credits who haven\'t attended for a period are automatically classified as \'Dormant\'. View and manage them from the dashboard."': '"잔여 횟수가 있지만 일정 기간 출석하지 않은 회원은 \'잠든 회원\'으로 자동 분류됩니다. 대시보드에서 조회할 수 있습니다."',
    '"days inactive"': '"일간 미출석"',
    '"Identify members whose end date is approaching. An expiring badge appears on the dashboard, and automatic notifications can be sent."': '"수강 종료일이 다가오는 회원을 식별합니다. 대시보드에 만료 임박 뱃지가 표시되며 안내 메시지를 보낼 수 있습니다."',
    '"days before expiry"': '"일 전부터 표시"',
    '"The end date is always auto-calculated as \'Start Date + Duration (months) - 1 day\'. e.g., Start: March 25 + 3 months = End: June 24."': '"종료일은 항상 \'시작일 + 수강기간(개월) - 1일\'로 자동 계산됩니다. 예: 시작일 3/25 + 3개월 = 종료일 6/24"',
    '`Bookings open ${bookingRules.windowDays || 7} days before class. Past classes cannot be booked.`': '`수업 시작 ${bookingRules.windowDays || 7}일 전부터 예약이 열립니다. 지난 수업은 예약 불가합니다.`',
    '"days before"': '"일 전"',
    '`Max ${bookingRules.maxActiveBookings || 3} active bookings at a time, max ${bookingRules.maxDailyBookings || 2} per day.`': '`동시에 최대 ${bookingRules.maxActiveBookings || 3}개 예약 가능하며, 하루 최대 ${bookingRules.maxDailyBookings || 2}회 예약 가능합니다.`',
    '"active"': '"개 유지"',
    '"per day"': '"회/일"',
    '`Default capacity is ${bookingRules.defaultCapacity || 15} per class. When full,`': '`기본 정원은 수업당 ${bookingRules.defaultCapacity || 15}명입니다. 정원이 다 차면`',
    '"automatically added to waitlist. When someone cancels, the first waitlisted member is auto-confirmed and notified."': '"자동으로 대기 명단에 등록됩니다. 취소자가 생기면 대기 1순위 회원이 자동 확정되고 알림이 발송됩니다."',
    '"the booking is refused (waitlist disabled)."': '"예약이 거부됩니다 (대기 명단 비활성화)."',
    '"Capacity"': '"정원"',
    '"Waitlist active: auto-promotion + notification on cancellation"': '"대기 명단 활성화: 취소 발생 시 자동 승급 및 알림 발송"',
    '`If a member doesn\'t attend after booking, it\'s automatically marked as no-show after class time. ${bookingRules.noshowCreditDeduct || 1} credit(s) deducted and admin is notified.`': '`예약 후 출석하지 않으면 수업 종료 후 자동으로 노쇼(No-show) 처리됩니다. 횟수가 ${bookingRules.noshowCreditDeduct || 1}회 차감되며 관리자에게 알림 전송.\`',
    '"No-show"': '"노쇼 차감"',
    '`Cancel up to ${bookingRules.cancelDeadlineHours || 3} hours before class. After the deadline, cancellation is not possible and absence will be marked as no-show.`': '`수업 시작 ${bookingRules.cancelDeadlineHours || 3}시간 전까지만 취소 가능합니다. 마감 시간 이후에는 취소 불가(노쇼 처리).\`',
    '"before class"': '"시간 전"',
    '"Weekly mode: Credits reset each week. Weekly attendance limits apply per member."': '"주간 모드: 매주 횟수가 갱신됩니다. 회원별 주간 최대 출석 횟수 제한이 적용됩니다."',
    '"Total Credit Mode: 1 credit is deducted per attendance/booking from the total credits given at registration. No weekly limit."': '"전체 횟수 모드: 등록 시 부여된 총 횟수에서 출석/예약 시마다 1회씩 차감됩니다. 주간 제한 없음."',
    '"Weekly Reset Mode"': '"주간 갱신 모드"',
    '"Total Credit Mode"': '"전체 횟수 모드"',
    '"Messages require admin approval before sending, so you can rest assured."': '"메시지 발송 전 반드시 관리자의 승인(검토)을 거치도록 설정되어 있어 안전합니다."'
};
for (const [k, v] of Object.entries(replacements)) {
    c = c.replace(k, v);
}
fs.writeFileSync(file, c);
console.log("Translation replaced.");
