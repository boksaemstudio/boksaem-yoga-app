const fs = require('fs');
const path = require('path');

const guideFile = path.join(__dirname, '..', 'src', 'components', 'admin', 'tabs', 'OperationsGuideTab.jsx');
let content = fs.readFileSync(guideFile, 'utf8');

// Replace remaining Korean fallbacks  
const replacements = [
  // Comment: 운영 가이드 탭
  ['운영 가이드 탭 — 업장의 모든 비즈니스 규칙을 원장이 이해하기 쉬운 말로 설명', 'Operations Guide Tab — Explains all business rules in plain language'],
  ['Firestore 호출 없이 현재 config에서 실제 설정값을 읽어 동적으로 표시', 'Reads actual settings from config and displays dynamically without Firestore calls'],
  
  // t() fallbacks with Korean  
  ['"g_c6c674") || "미설정"', '"g_c6c674") || "Not set"'],
  
  // Line 212: end date calculation Korean
  [`t('종료일은 항상 \\'시작일 + 수강권 기간(개월) - 1일\\'로 자동 계산됩니다. 예를 들어 시작일이 3월 25일이고 3개월 수강권이면 종료일은 6월 24일입니다.')`, 
   `t("g_enddate_calc_desc") || "The end date is always auto-calculated as 'Start Date + Duration (months) - 1 day'. e.g., Start: March 25 + 3 months = End: June 24."`],
  
  // Line 245: credit rules Korean
  [`t("g_91c1ba") || "총횟수 모드: 등록 시 부여된 총 횟수에서 출석/예약마다 1회씩 차감됩니다. 주간 제한 없이 원하는 만큼 수강 가능합니다."`,
   `t("g_91c1ba") || "Total Credit Mode: 1 credit is deducted per attendance/booking from the total credits given at registration. No weekly limit."`],
  [`t("g_ff872c") || "주간 리셋 모드"`, `t("g_ff872c") || "Weekly Reset Mode"`],
  [`t("g_32e689") || "총횟수 차감 모드"`, `t("g_32e689") || "Total Credit Mode"`],
  
  // Section headers Korean comments
  ['회원 & 출석', 'Members & Attendance'],
  ['회원권 등록/재등록 로직', 'Membership Registration Logic'],
  ['예약 시스템', 'Booking System'],
  ['알림 & 보안', 'Alerts & Security'],
  ['AI & 자동화', 'AI & Automation'],
  ['헤더', 'Header'],
  ['하단 안내', 'Footer'],
  
  // waitlist Korean fallbacks
  [`t("g_662e6c") || "자동으로 대기열에 등록되며, 누군가 취소하면 대기 1번째 회원이 자동으로 예약 확정되고 푸시 알림을 받습니다."`,
   `t("g_662e6c") || "automatically added to waitlist. When someone cancels, the first waitlisted member is auto-confirmed and notified."`],
  [`t("g_fcc7d1") || "예약이 거부됩니다 (대기열 비활성화)."`,
   `t("g_fcc7d1") || "the booking is refused (waitlist disabled)."`],
  [`t("g_627804") || "대기열 활성화 상태: 취소 발생 시 자동 승격 + 알림"`,
   `t("g_627804") || "Waitlist active: auto-promotion + notification on cancellation"`],
];

let count = 0;
replacements.forEach(([from, to]) => {
  if (content.includes(from)) {
    content = content.replace(from, to);
    count++;
  }
});

fs.writeFileSync(guideFile, content, 'utf8');
console.log(`✅ Round 2: ${count} more Korean strings replaced`);

// Check remaining Korean (excluding import paths and variable names)
const lines = content.split('\n');
const koreanLines = [];
lines.forEach((line, i) => {
  // Skip comments 
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
  // Check for Korean characters in string literals
  const matches = line.match(/["'`][^"'`]*[가-힣]+[^"'`]*["'`]/g);
  if (matches) {
    matches.forEach(m => {
      // Skip if it's a t() key like t("g_xxxx")
      if (/^["']g_/.test(m)) return;
      koreanLines.push({ line: i + 1, text: m.substring(0, 60) });
    });
  }
});

if (koreanLines.length === 0) {
  console.log('✅ No Korean in string literals!');
} else {
  console.log(`⚠️ ${koreanLines.length} Korean strings remaining in literals:`);
  koreanLines.forEach(k => console.log(`   L${k.line}: ${k.text}`));
}
