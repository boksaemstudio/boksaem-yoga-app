/**
 * SAFE injection: Only add NAMED keys (ASCII keys like navAttendance)
 * that are used in source code but missing from ko dictionary.
 * Does NOT touch Korean-text keys (handled by t() function fix).
 */
const fs = require('fs');
const path = require('path');

const translationsPath = path.join(__dirname, '..', 'src', 'utils', 'translations.js');
let content = fs.readFileSync(translationsPath, 'utf8');

// Verify syntax first
try {
  require('child_process').execSync(`node -c "${translationsPath}"`, { stdio: 'pipe' });
} catch (e) {
  console.error('❌ File already has syntax errors! Cannot proceed.');
  process.exit(1);
}

// Extract ko section keys
const koStartIdx = content.indexOf('ko: {');
const enStartIdx = content.indexOf('en: {', koStartIdx + 100);
const koSection = content.substring(koStartIdx, enStartIdx);

const definedKeys = new Set();
const kvRegex = /(?:^|\s)(\w+)\s*:\s*["']/gm;
let m;
while ((m = kvRegex.exec(koSection)) !== null) {
  definedKeys.add(m[1]);
}

// Known named key translations
const namedKeys = {
  // Admin Nav
  navAttendance: '출석', navMembers: '회원', navRevenue: '매출',
  navSchedule: '시간표', navBookings: '예약', navNotices: '공지',
  navAlertHistory: '알림', navKiosk: '키오스크', navPricing: '가격',
  navData: '데이터', navTrash: '휴지통', navAIAssistant: 'AI 도우미',
  navGuide: '가이드', navSettings: '설정',
  
  // Admin Header
  management: '관리자',
  
  // Admin Trend
  admin_trend_title: '출석 추세 분석',
  admin_trend_tab_daily: '일별 추세',
  admin_trend_tab_heatmap: '히트맵',
  admin_trend_tab_ranking: '인기 분석',
  admin_trend_analyzing: '출석 추세 분석 중...',
  admin_trend_general: '일반',
  admin_trend_unassigned: '미지정',
  admin_trend_admin: '관리자',
  admin_trend_day_sun: '일', admin_trend_day_mon: '월',
  admin_trend_day_tue: '화', admin_trend_day_wed: '수',
  admin_trend_day_thu: '목', admin_trend_day_fri: '금',
  admin_trend_day_sat: '토',
  
  // Days
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
  
  // Common
  unlimited: '무제한', won: '원', times: '회', ticket: '회원권',
  loading: '로딩 중...', processing: '처리 중...',
  close: '닫기', cancel: '취소', confirm: '확인',
  save: '저장', delete: '삭제', edit: '수정', recent: '최근',
  no: '아니오',
  
  // Profile tabs
  tabHome: '홈', tabHistory: '출석기록', tabSchedule: '시간표',
  tabPrices: '가격', tabNotices: '공지', tabMessages: '메시지',
  
  // Member 
  remainingCredits: '잔여 횟수', recentAttendance: '최근 출석',
  viewAll: '전체보기', viewCalendar: '달력 보기', viewWeekly: '주간 보기',
  selfPractice: '자율수련', totalAttendance: '총 출석',
  yes_thats_me: '네, 맞습니다', nim: '님',
  
  // Push
  pushNotification: '푸시 알림', pushOnLabel: '켜짐', pushOffLabel: '꺼짐',
  pushSetSuccess: '알림 설정이 변경되었습니다.',
  pushSetFail: '알림 설정에 실패했습니다.',
  pushTurnOffConfirm: '알림을 끄시겠습니까?',
  pushNotificationTitle: '푸시 알림',
  pushNotificationDesc: '출석 및 공지 알림을 받습니다.',
  settingUp: '설정 중...',
  
  // Season/Time
  season_spring: '봄', season_summer: '여름',
  season_autumn: '가을', season_winter: '겨울',
  trad_dawn: '새벽', trad_morning: '아침',
  trad_afternoon: '오후', trad_evening: '저녁', trad_night: '밤',
  
  // Pricing/Schedule
  tuitionFee: '수강료', ticketType: '회원권 종류',
  threeMonthDiscount: '3개월 할인', sixMonthDiscount: '6개월 할인',
  scheduleTitle: '수업 시간표', scheduleSub: '수업 시간을 확인하세요',
  timetableLabel: '시간표', workoutReport: '운동 리포트',
  
  // Stats
  stats_title: '통계', stats_empty: '통계 데이터가 없습니다',
  todayWisdom: '오늘의 지혜', todayActivityLog: '오늘의 출석 기록',
  
  // Sales
  statusActive: '유효', statusExpired: '만료',
  statusPending: '대기', statusNone: '없음',
  startDate: '시작일', remainCount: '잔여 횟수',
  viewNotice: '공지 보기', unknownError: '알 수 없는 오류가 발생했습니다.',
  system_privacy: '개인정보 처리방침', privacy_policy: '개인정보 처리방침',
  
  // Login/Auth
  loginTitle: '내 요가', loginWelcome: '안녕하세요!',
  loginSub: '이름과 전화번호로 로그인하세요',
  nameLabel: '이름', namePlaceholder: '이름을 입력해주세요',
  phoneLabel: '전화번호', phonePlaceholder: '예: 01012345678',
  checkRecordBtn: '내 기록 확인', loginFooter: '출석 기록 조회',
  inputError: '입력 오류', loginError: '로그인에 실패했습니다.',
  logoutConfirm: '로그아웃 하시겠습니까?',
  loginFailed: '로그인에 실패했습니다.',
  errorMemberNotFound: '등록된 회원을 찾을 수 없습니다.',
  demoStudioName: '데모 스튜디오', adminSystem: '관리자 시스템',
  emailLabel: '이메일', passwordLabel: '비밀번호',
  authenticating: '인증 중...', loginBtn: '로그인',
  demoAutoLogin: '데모 자동 로그인', kakaoSupport: '카카오톡 문의',
  
  // Checkin
  checkin_verifying: '확인 중...', checkin_success: '출석 완료!',
  checkin_extra: '추가 출석', checkin_consecutive: '연속 출석',
  checkin_expired_contact_teacher: '수강권이 만료되었습니다. 선생님에게 문의해 주세요.',
  checkin_credits_empty_contact_teacher: '잔여 횟수가 없습니다. 선생님에게 문의해 주세요.',
  checkin_last_session: '마지막 1회',
  checkin_ai_peaceful: '마음이 편안해지는 하루 되세요',
  checkin_member_not_found: '등록되지 않은 번호입니다',
  checkin_member_not_found_sub: '번호를 다시 확인하시거나 선생님에게 문의해 주세요.',
  checkin_expired: '수강권 만료', checkin_expired_sub: '수강권을 갱신해 주세요.',
  checkin_failed: '출석 처리 실패', checkin_failed_sub: '잠시 후 다시 시도해 주세요.',
  checkin_system_error: '시스템 오류', checkin_system_error_sub: '관리자에게 문의해 주세요.',
  checkin_closed_title: '운영 시간 외', checkin_closed_sub: '운영 시간에 다시 방문해 주세요.',
  checkin_touch_to_start: '터치하여 시작',
  checkin_confirm_question: '본인이 맞으신가요?',
  checkin_pin_alternative: 'PIN으로 입력',
  
  // Instructor
  inst_page_day_weekend: '주말',
  inst_page_logout_confirm: '로그아웃 하시겠습니까?',
  inst_sch_loading: '시간표 로딩 중...',
  inst_page_push_setting: '푸시 알림 설정',
  inst_page_push_on: '알림 켜짐', inst_page_push_off: '알림 꺼짐',
  inst_page_ai_preparing: 'AI 인사말 준비 중...',
  
  // Member profile extras  
  holdApplied: '홀딩이 적용되었습니다.',
  holdFailed: '홀딩 적용에 실패했습니다.',
  holdError: '홀딩 처리 중 오류가 발생했습니다.',
  holdingStatus: '홀딩 중', holdPauseTitle: '홀딩(일시정지)',
  holdAutoRelease: '자동 해제', holdBtnLabel: '홀딩 신청',
  holdModalTitle: '홀딩 신청', holdSelectPeriod: '기간 선택',
  holdNoteAuto: '선택한 기간이 끝나면 자동으로 해제됩니다.',
  holdNoteExtend: '홀딩 기간만큼 마감일이 연장됩니다.',
  currentMembership: '현재 수강권', expiryDate: '마감일',
  endDateTBD: '첫 출석 시 확정', daysLeft: '일 남음',
  daysLeftHolding: '일 남음 (홀딩 중)', expired: '만료됨',
  messagesTitle: '메시지', messagesSubtitle: '선생님이 보낸 메시지',
  noMessages: '메시지가 없습니다', msgIndividual: '개별', msgNotice: '공지',
  etcLabel: '기타', myYogaTaste: '나의 요가 취향',
  practiceCount: '수련 횟수', bookingTab: '예약', meditation: '명상',
  noticesTitle: '공지사항', noNewNotices: '새 공지가 없습니다',
  loadingPayment: '결제 내역 로딩 중...', myPassStatus: '나의 패스 현황',
  endDate: '마감일', countUnit: '회',
  paymentHistory: '결제 내역', noPaymentHistory: '결제 내역이 없습니다',
  paymentItem: '결제 항목', currentlyUsing: '현재 사용 중',
  preRegistered: '등록 예정', payCard: '카드', payCash: '현금',
  payOther: '기타', payTransfer: '이체', paidOn: '결제일',
  monthUnit: '개월', longTermDiscount: '장기 할인',
  classLabel: '수업', cashLabel: '현금', deferRules: '환불/연기 규정',
  accountCopied: '계좌번호가 복사되었습니다.', paymentAccount: '입금 계좌',
  accountHolder: '예금주', preview: '미리보기',
  noTimetableImage: '시간표 이미지가 등록되지 않았습니다',
  analysisPending: '분석 중...',
  loadMsg1: '수련 기록 불러오는 중...', loadMsg2: '요가 여정 분석 중...',
  loadMsg3: '통계 계산 중...', loadMsg4: '거의 다 되었어요...',
  aiPracticeAnalysis: 'AI 수련 분석', notEnoughData: '데이터가 부족합니다',
  practiceHistory: '수련 기록', listView: '목록 보기', calendarView: '달력 보기',
  deniedNoCredits: '잔여 횟수 부족', deniedExpired: '수강권 만료',
  cancelAttendance: '출석 취소', loadMoreAttendance: '더 보기',
  loadMoreN: '더 보기', noAttendanceHistory: '출석 기록이 없습니다',
  homeYogaTitle: '홈 요가',
  inAppBrowserWarning: '인앱 브라우저에서는 일부 기능이 제한됩니다.',
  installApp: '앱 설치', installBtn: '설치', appInstallGuide: '앱 설치 가이드',
};

// Filter to only missing keys
const toInject = {};
Object.entries(namedKeys).forEach(([k, v]) => {
  if (!definedKeys.has(k)) {
    toInject[k] = v;
  }
});

console.log(`ko section: ${definedKeys.size} existing keys`);
console.log(`Need to inject: ${Object.keys(toInject).length} named keys`);

if (Object.keys(toInject).length === 0) {
  console.log('✅ No keys to inject!');
  process.exit(0);
}

// Build injection string - simple, safe, no special chars
const lines = Object.entries(toInject)
  .map(([k, v]) => `    ${k}: "${v}",`)
  .join('\n');

// Find the position just after 'ko: {' line
const koLineEnd = content.indexOf('\n', koStartIdx) + 1;
const injection = `    // [AUTO] Missing named keys\n${lines}\n`;

content = content.slice(0, koLineEnd) + injection + content.slice(koLineEnd);

// Verify syntax
const tmpPath = translationsPath + '.tmp';
fs.writeFileSync(tmpPath, content);
try {
  require('child_process').execSync(`node -c "${tmpPath}"`, { stdio: 'pipe' });
  fs.renameSync(tmpPath, translationsPath);
  console.log(`✅ Safely injected ${Object.keys(toInject).length} keys`);
} catch (e) {
  fs.unlinkSync(tmpPath);
  console.error('❌ Syntax error in result! Injection aborted.');
  process.exit(1);
}
