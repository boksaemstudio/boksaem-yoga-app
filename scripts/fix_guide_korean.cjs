const fs = require('fs');
const path = require('path');

// Fix OperationsGuideTab.jsx - replace hardcoded Korean fallbacks with English
const guideFile = path.join(__dirname, '..', 'src', 'components', 'admin', 'tabs', 'OperationsGuideTab.jsx');
let content = fs.readFileSync(guideFile, 'utf8');

const replacements = [
  // Line 196: description with hardcoded Korean string passed to t()
  [
    `t('기간이 만료(종료일 초과)되었거나 잔여 횟수가 0인 회원은 키오스크에서 자동으로 출석이 거부됩니다. 화면에 \\'기간 만료\\' 또는 \\'횟수 부족\\' 사유가 표시됩니다.')`,
    `t("g_att_refusal_desc") || "When a member's period has expired or remaining credits reach 0, check-in is automatically refused at the kiosk. The screen shows the reason: 'Period Expired' or 'No Credits'."`
  ],
  // Line 197: fallback Korean for TBD
  [
    `t("g_bed607") || "회원 등록 시 시작일을 \\"TBD(미정)\\"로 설정할 수 있습니다. 이 회원이 처음 출석하는 날이 자동으로 시작일이 되고, 수강 기간에 따라 종료일이 자동 계산됩니다."`,
    `t("g_bed607") || "Set the start date to 'TBD' during registration. The first attendance day automatically becomes the start date, and the end date is calculated based on the membership duration."`
  ],
  // Line 198: holding description - entirely hardcoded Korean
  [
    '`회원의 수강권을 일시정지할 수 있습니다. 홀딩 중에 출석하면 자동으로 해제되며, 실제 정지한 일수만큼 종료일이 자동 연장됩니다.${holdRules.length > 0 ? ` 현재 설정된 홀딩 규칙: ${holdRules.map(r => `${r.durationMonths}개월권 → 최대 ${r.maxCount}회, ${r.maxWeeks}주`).join(\' | \')}` : \'\'}`',
    '`${t("g_hold_desc") || "Temporarily pause a membership. If the member attends during a hold, it is automatically released. The end date is extended by the actual number of paused days."}${holdRules.length > 0 ? ` ${t("g_hold_current") || "Current rules"}: ${holdRules.map(r => `${r.durationMonths}${t("g_months") || "mo"} → max ${r.maxCount}x, ${r.maxWeeks}${t("g_weeks") || "wk"}`).join(\' | \')}` : \'\'}`'
  ],
  // Line 198: badge Korean
  [
    'holdRules.length > 0 ? `${holdRules.length}개 규칙 설정됨`',
    'holdRules.length > 0 ? `${holdRules.length} ${t("g_rules_set") || "rules configured"}`'
  ],
  // Line 200: dormant member description fallback
  [
    `t("g_00a928") || "잔여 횟수가 있지만 일정 기간 출석하지 않은 회원은 '잠든 회원'으로 자동 분류됩니다. 대시보드에서 이 회원들을 한 눈에 확인하고 관리할 수 있습니다."`,
    `t("g_00a928") || "Members with remaining credits who haven't attended for a period are automatically classified as 'Dormant'. View and manage them from the dashboard."`
  ],
  // Line 200: badge Korean
  [
    '`${policies.DORMANT_THRESHOLD_DAYS || 14}일 미출석`',
    '`${policies.DORMANT_THRESHOLD_DAYS || 14} ${t("g_days_inactive") || "days inactive"}`'
  ],
  // Line 201: expiring member description fallback
  [
    `t("g_42608c") || "종료일이 가까워진 회원을 미리 파악할 수 있습니다. 대시보드에 만료 임박 배지가 표시되며, 자동 알림을 보낼 수 있습니다."`,
    `t("g_42608c") || "Identify members whose end date is approaching. An expiring badge appears on the dashboard, and automatic notifications can be sent."`
  ],
  // Line 201: badge Korean
  [
    '`종료 ${policies.EXPIRING_THRESHOLD_DAYS || 7}일 전부터`',
    '`${policies.EXPIRING_THRESHOLD_DAYS || 7} ${t("g_days_before_end") || "days before expiry"}`'
  ],
  // Line 240: booking window Korean
  [
    '`수업 시작 ${bookingRules.windowDays || 7}일 전부터 예약할 수 있습니다. 지난 수업은 예약할 수 없습니다.`',
    '`${t("g_booking_window_desc") || `Bookings open ${bookingRules.windowDays || 7} days before class. Past classes cannot be booked.`}`'
  ],
  // Line 240: badge Korean 
  [
    '`${bookingRules.windowDays || 7}일 전부터`',
    '`${bookingRules.windowDays || 7} ${t("g_days_before") || "days before"}`'
  ],
  // Line 241: max bookings Korean
  [
    '`한 회원이 동시에 유지할 수 있는 예약은 최대 ${bookingRules.maxActiveBookings || 3}건, 하루에 예약할 수 있는 수업은 최대 ${bookingRules.maxDailyBookings || 2}건입니다.`',
    '`${t("g_max_booking_desc") || `Max ${bookingRules.maxActiveBookings || 3} active bookings at a time, max ${bookingRules.maxDailyBookings || 2} per day.`}`'
  ],
  // Line 241: badge Korean
  [
    '`동시 ${bookingRules.maxActiveBookings || 3}건 / 하루 ${bookingRules.maxDailyBookings || 2}건`',
    '`${bookingRules.maxActiveBookings || 3} ${t("g_active") || "active"} / ${bookingRules.maxDailyBookings || 2} ${t("g_per_day") || "per day"}`'
  ],
  // Line 242: capacity Korean
  [
    '`수업당 정원은 기본 ${bookingRules.defaultCapacity || 15}명입니다. 정원이 차면 ${bookingRules.enableWaitlist !== false',
    '`${t("g_capacity_desc") || `Default capacity is ${bookingRules.defaultCapacity || 15} per class. When full,`} ${bookingRules.enableWaitlist !== false'
  ],
  // Line 242: badge Korean  
  [
    '`정원 ${bookingRules.defaultCapacity || 15}명`',
    '`${t("g_capacity") || "Capacity"}: ${bookingRules.defaultCapacity || 15}`'
  ],
  // Line 243: no-show Korean
  [
    '`예약 후 수업에 출석하지 않으면 수업 시간이 지난 후 자동으로 \'노쇼\'로 처리됩니다. 노쇼 시 잔여 횟수가 ${bookingRules.noshowCreditDeduct || 1}회 차감되며, 관리자에게 알림이 발송됩니다.`',
    '`${t("g_noshow_desc") || `If a member doesn\'t attend after booking, it\'s automatically marked as no-show after class time. ${bookingRules.noshowCreditDeduct || 1} credit(s) deducted and admin is notified.`}`'
  ],
  // Line 243: badge Korean
  [
    '`노쇼 시 ${bookingRules.noshowCreditDeduct || 1}회 차감`',
    '`${t("g_noshow_deduct") || "No-show"}: -${bookingRules.noshowCreditDeduct || 1}`'
  ],
  // Line 244: cancel deadline Korean
  [
    '`수업 시작 ${bookingRules.cancelDeadlineHours || 3}시간 전까지만 취소할 수 있습니다. 마감 이후에는 취소가 불가능하며 출석하지 않으면 노쇼 처리됩니다.`',
    '`${t("g_cancel_desc") || `Cancel up to ${bookingRules.cancelDeadlineHours || 3} hours before class. After the deadline, cancellation is not possible and absence will be marked as no-show.`}`'
  ],
  // Line 244: badge Korean
  [
    '`수업 ${bookingRules.cancelDeadlineHours || 3}시간 전`',
    '`${bookingRules.cancelDeadlineHours || 3}h ${t("g_before_class") || "before class"}`'
  ],
  // Line 256: notification description fallback
  [
    "t('자동 발송이 아닌 \\'관리자 승인 후 발송\\' 방식이므로 안심하셔도 됩니다.')",
    `t("g_notif_approval_tip") || "Messages require admin approval before sending, so you can rest assured."`
  ],
  // Line 157: section count suffix Korean
  [
    't("g_90e697") || "개 규칙"',
    't("g_90e697") || " rules"'
  ],
];

let changeCount = 0;
replacements.forEach(([from, to]) => {
  if (content.includes(from)) {
    content = content.replace(from, to);
    changeCount++;
  }
});

// Also fix credit rules Korean on line 245
content = content.replace(
  /`주간 모드: 매주 \$\{.*?\}요일에 주간 횟수가 리셋됩니다\. 회원별 주간 수강 횟수 제한이 적용됩니다\.`/,
  '`${t("g_weekly_mode_desc") || "Weekly mode: Credits reset each week. Weekly attendance limits apply per member."}`'
);

fs.writeFileSync(guideFile, content, 'utf8');
console.log(`✅ OperationsGuideTab: ${changeCount} Korean hardcoded strings replaced`);

// Verify remaining Korean
const remaining = content.match(/[가-힣]{3,}/g) || [];
const filtered = remaining.filter(k => !['운영', '가이드'].includes(k)); // comments OK
console.log(`   Remaining Korean strings: ${filtered.length}`);
if (filtered.length > 0) {
  filtered.slice(0, 10).forEach(k => console.log(`     - "${k}"`));
}
