/**
 * SECOND PASS: Find ALL remaining missing named keys from source code
 * by extracting both the key and looking for corresponding g_ hash keys
 * that have Korean values in the existing dictionary
 */
const fs = require('fs');

const translationsContent = fs.readFileSync(__dirname + '/../src/utils/translations.js', 'utf8');

// Get existing ko keys
const koSection = translationsContent.substring(
  translationsContent.indexOf('ko: {'),
  translationsContent.indexOf('\n    en: {') || translationsContent.indexOf('\n  en: {')
);

const definedKeys = new Set();
const keyRegex2 = /['"]?([a-zA-Z_][a-zA-Z0-9_]*)['"]?\s*:\s*["']/g;
let m2;
while ((m2 = keyRegex2.exec(koSection)) !== null) {
  definedKeys.add(m2[1]);
}

// The massive list of still-missing keys to add manually
const additionalKeys = {
  // Admin Header
  management: '관리자',
  
  // Attendance stat cards (LogsTab SummaryCards)
  admin_log_total_label: '총 출석 완료',
  admin_log_total_unit: '건',
  admin_log_multi_label: '복수 출석 (열정 회원)',
  admin_log_multi_unit: '명',
  admin_log_alert_label: '출석 제한/거부',
  admin_log_alert_action: '조치 필요',
  admin_log_best_class: '인기 수업',
  admin_log_participation: '참여',
  
  // Attendance trend
  admin_trend_title: '출석 추세 분석',
  admin_trend_tab_daily: '일별 추세',
  admin_trend_tab_heatmap: '히트맵',
  admin_trend_tab_ranking: '인기 분석',
  admin_trend_analyzing: '출석 추세 분석 중...',
  admin_trend_general: '일반',
  admin_trend_unassigned: '미지정',
  admin_trend_admin: '관리자',
  admin_trend_daily_label: '일별 추세',
  admin_trend_moving_avg: '7일 이동평균',
  admin_trend_today: '오늘',
  admin_trend_prev: '이전',
  admin_trend_new_member: '신규',
  admin_trend_existing_member: '기존',
  admin_trend_people: '명',
  admin_trend_new_ratio: '신규 비율',
  admin_trend_existing_ratio: '기존 비율',
  admin_trend_total_unique: '순수 인원(명) 기준',
  admin_trend_new_members_label: '신규 회원',
  admin_trend_existing_members_label: '기존 회원',
  number_of_people: '명',
  
  // Day names for trend chart
  admin_trend_day_sun: '일',
  admin_trend_day_mon: '월',
  admin_trend_day_tue: '화',
  admin_trend_day_wed: '수',
  admin_trend_day_thu: '목',
  admin_trend_day_fri: '금',
  admin_trend_day_sat: '토',
  
  // Trend chart period
  admin_trend_period_select: '기간 선택',
  admin_trend_branch_all: '전체',
  admin_trend_this_week: '이번 주',
  admin_trend_last_week: '지난 주',
  admin_trend_same_period: '동일 시점 대비',
  
  // Heatmap
  admin_heatmap_label: '요일별 시간대 히트맵',
  admin_heatmap_visits: '회',
  admin_heatmap_time: '시',
  
  // Popularity
  admin_ranking_class_title: '수업별 인기',
  admin_ranking_instructor_title: '강사별 인기',
  admin_ranking_recent: '최근',
  admin_ranking_total_label: '기준, 수업/강사별 총 출석 수',
  admin_ranking_all: '(전체)',
  
  // LogsTab
  todayActivityLog: '오늘의 출석 기록',
  admin_log_date_nav: '날짜 이동',
  admin_today: '오늘',
  
  // Checkin page
  checkin_verifying: '확인 중...',
  checkin_success: '출석 완료!',
  checkin_extra: '추가 출석',
  checkin_consecutive: '연속 출석',
  checkin_expired_contact_teacher: '수강권이 만료되었습니다. 선생님에게 문의해 주세요.',
  checkin_credits_empty_contact_teacher: '잔여 횟수가 없습니다. 선생님에게 문의해 주세요.',
  checkin_last_session: '마지막 1회',
  checkin_ai_peaceful: '마음이 편안해지는 하루 되세요 🧘',
  checkin_member_not_found: '등록되지 않은 번호입니다',
  checkin_member_not_found_sub: '번호를 다시 확인하시거나 선생님에게 문의해 주세요.',
  checkin_expired: '수강권 만료',
  checkin_expired_sub: '수강권을 갱신해 주세요.',
  checkin_failed: '출석 처리 실패',
  checkin_failed_sub: '잠시 후 다시 시도해 주세요.',
  checkin_system_error: '시스템 오류',
  checkin_system_error_sub: '관리자에게 문의해 주세요.',
  checkin_closed_title: '운영 시간 외',
  checkin_closed_sub: '운영 시간에 다시 방문해 주세요.',
  checkin_touch_to_start: '터치하여 시작',
  checkin_confirm_question: '본인이 맞으신가요?',
  no: '아니오',
  checkin_pin_alternative: 'PIN으로 입력',
  privacy_policy: '개인정보 처리방침',
  yes_thats_me: '네, 맞습니다',
  
  // Member profile
  nim: '님',
  holdingStatus: '홀딩 중',
  holdApplied: '홀딩이 적용되었습니다.',
  holdFailed: '홀딩 적용에 실패했습니다.',
  holdError: '홀딩 처리 중 오류가 발생했습니다.',
  holdPauseTitle: '홀딩(일시정지)',
  holdAutoRelease: '자동 해제',
  holdBtnLabel: '홀딩 신청',
  holdModalTitle: '홀딩 신청',
  holdSelectPeriod: '기간 선택',
  holdNoteAuto: '선택한 기간이 끝나면 자동으로 해제됩니다.',
  holdNoteExtend: '홀딩 기간만큼 마감일이 연장됩니다.',
  currentMembership: '현재 수강권',
  expiryDate: '마감일',
  endDateTBD: '첫 출석 시 확정',
  daysLeft: '일 남음',
  daysLeftHolding: '일 남음 (홀딩 중)',
  expired: '만료됨',
  
  // Messages
  messagesTitle: '메시지',
  messagesSubtitle: '선생님이 보낸 메시지',
  noMessages: '메시지가 없습니다',
  msgIndividual: '개별',
  msgNotice: '공지',
  
  // Profile
  etcLabel: '기타',
  myYogaTaste: '나의 요가 취향',
  practiceCount: '수련 횟수',
  bookingTab: '예약',
  meditation: '명상',
  inAppBrowserWarning: '인앱 브라우저에서는 일부 기능이 제한됩니다.',
  installApp: '앱 설치',
  installDescIOS: 'iOS에서 앱을 설치하세요',
  installDescAndroid: 'Android에서 앱을 설치하세요',
  installBtn: '설치',
  appInstallGuide: '앱 설치 가이드',
  noticesTitle: '공지사항',
  noNewNotices: '새 공지가 없습니다',
  
  // Pricing
  monthUnit: '개월',
  longTermDiscount: '장기 할인',
  classLabel: '수업',
  cashLabel: '현금',
  deferRules: '환불/연기 규정',
  accountCopied: '계좌번호가 복사되었습니다.',
  paymentAccount: '입금 계좌',
  accountHolder: '예금주',
  preview: '미리보기',
  noTimetableImage: '시간표 이미지가 등록되지 않았습니다',
  
  // Sales
  loadingPayment: '결제 내역 로딩 중...',
  myPassStatus: '나의 패스 현황',
  endDate: '마감일',
  countUnit: '회',
  paymentHistory: '결제 내역',
  noPaymentHistory: '결제 내역이 없습니다',
  paymentItem: '결제 항목',
  currentlyUsing: '현재 사용 중',
  preRegistered: '등록 예정',
  payCard: '카드',
  payCash: '현금',
  payOther: '기타',
  payTransfer: '이체',
  paidOn: '결제일',
  
  // Login
  inputError: '입력 오류',
  loginTitle: '내 요가',
  loginWelcome: '안녕하세요!',
  loginSub: '이름과 전화번호로 로그인하세요',
  nameLabel: '이름',
  namePlaceholder: '이름을 입력해주세요',
  phoneLabel: '전화번호',
  phonePlaceholder: '예: 01012345678',
  checkRecordBtn: '내 기록 확인',
  loginFooter: '출석 기록 조회',
  loginError: '로그인에 실패했습니다.',
  logoutConfirm: '로그아웃 하시겠습니까?',
  loginFailed: '로그인에 실패했습니다.',
  errorMemberNotFound: '등록된 회원을 찾을 수 없습니다.',
  
  // Instructor
  inst_page_day_weekend: '주말',
  inst_page_logout_confirm: '로그아웃 하시겠습니까?',
  inst_sch_loading: '시간표 로딩 중...',
  inst_page_push_setting: '푸시 알림 설정',
  inst_page_push_on: '알림 켜짐',
  inst_page_push_off: '알림 꺼짐',
  inst_page_ai_preparing: 'AI 인사말 준비 중...',
  system_privacy: '개인정보 처리방침',
  
  // Auth
  demoStudioName: '데모 스튜디오',
  adminSystem: '관리자 시스템',
  emailLabel: '이메일',
  passwordLabel: '비밀번호',
  authenticating: '인증 중...',
  loginBtn: '로그인',
  demoAutoLogin: '데모 자동 로그인',
  kakaoSupport: '카카오톡 문의',
  
  // Marketing
  mkt_feat_page_title: 'PassFlow 기능',
  mkt_feat_page_sub: 'AI 기반 스튜디오 운영 플랫폼',
  mkt_title_main: 'PassFlow AI',
  
  // Workout report
  member_workout_avg_hr: '평균 심박수',
  member_workout_duration: '운동 시간',
  member_workout_max_hr: '최대 심박수',

  // Badge messages
  badge_msg_streak_fire: '연속 출석 달성!',
  badge_msg_high_freq: '높은 출석률!',
  
  // Health sync
  member_health_sync_title: '건강 데이터 동기화',
  member_health_sync_on: '동기화 켜짐',
  member_health_sync_off: '동기화 꺼짐',
  
  // MBTI
  member_mbti_title: '요가 성향 테스트',
  member_mbti_badge_desc_set: '요가 성향이 설정되었습니다.',
  member_mbti_badge_desc_unset: '요가 성향을 알아보세요',
  member_mbti_btn_complete: '완료',
  member_mbti_btn_reselect: '다시 선택',
  member_mbti_step1_label: '에너지를 어디서 얻나요?',
  member_mbti_step1_opt1_desc: '혼자만의 시간에서',
  member_mbti_step1_opt2_desc: '사람들과 함께',
  member_mbti_step2_label: '수련에서 중요한 것은?',
  member_mbti_step2_opt1_desc: '정확한 자세와 동작',
  member_mbti_step2_opt2_desc: '흐름과 느낌',
  member_mbti_step3_label: '새로운 동작을 배울 때?',
  member_mbti_step3_opt1_desc: '논리적 이해가 선행',
  member_mbti_step3_opt2_desc: '몸으로 먼저 느끼기',
  member_mbti_step4_label: '수련 스타일은?',
  member_mbti_step4_opt1_desc: '계획적이고 체계적',
  member_mbti_step4_opt2_desc: '즉흥적이고 유연하게',
  
  // Install
  installIOS: 'iOS 설치',
  installAndroid: 'Android 설치',
  installIOSDesc: 'iOS에서 앱을 설치하세요',
  installAndroidDesc: 'Android에서 앱을 설치하세요',
  iosShareStep1: '하단의 공유 버튼을 눌러주세요',
  iosShareStep2: '홈 화면에 추가를 선택하세요',
  bannerInstallTitle: '앱 설치',
  bannerInstallDesc: '홈 화면에 추가하세요',
  installGuideTitle: '앱 설치 가이드',
  installGuideSub: '간편하게 앱을 설치하세요',
  guideAndroid: 'Android',
  guideIOS: 'iOS',
  installGuideConfirm: '확인',
  guideChromeHint: 'Chrome 브라우저에서 열어주세요',
  guideAndroidStep1Title: '메뉴 열기',
  guideAndroidStep1Desc: '주소창 우측 ⋮ 메뉴를 터치하세요',
  guideAndroidStep2Title: '홈 화면에 추가',
  guideAndroidStep2Desc: '"홈 화면에 추가"를 선택하세요',
  installWord: '설치',
  guideInstallDone: '설치 완료!',
  guideAndroidStep3Desc: '홈 화면에서 앱을 실행하세요',
  guideSafariHint: 'Safari 브라우저에서 열어주세요',
  guideIOSStep1Title: '공유 버튼',
  guideIOSStep1Desc: '하단의 공유(⬆) 버튼을 터치하세요',
  guideIOSStep2Title: '홈 화면에 추가',
  guideIOSStep2Desc: '"홈 화면에 추가"를 선택하세요',
  addWord: '추가',
  guideIOSStep3Desc: '홈 화면에서 앱을 실행하세요',

  // Attendance history
  analysisPending: '분석 중...',
  loadMsg1: '수련 기록 불러오는 중...',
  loadMsg2: '요가 여정 분석 중...',
  loadMsg3: '통계 계산 중...',
  loadMsg4: '거의 다 되었어요...',
  aiPracticeAnalysis: 'AI 수련 분석',
  notEnoughData: '데이터가 부족합니다',
  practiceHistory: '수련 기록',
  listView: '목록 보기',
  calendarView: '달력 보기',
  deniedNoCredits: '잔여 횟수 부족',
  deniedExpired: '수강권 만료',
  cancelAttendance: '출석 취소',
  loadMoreAttendance: '더 보기',
  loadMoreN: '더 보기',
  noAttendanceHistory: '출석 기록이 없습니다',
  auto_practice: '자율수련',
  legend_regular: '일반',
  legend_pregnancy: '임산부',
  legend_intensive: '집중반',
  legend_saturday: '토요일',
  legend_my_practice: '내 수련일',
  
  // Crowd chart
  member_crowd_level_5: '매우 혼잡',
  member_crowd_analyzing: '분석 중...',
  member_crowd_title: '실시간 혼잡도',
  member_crowd_subtitle: '현재 수업 참여 인원',
  member_crowd_visit_now: '지금 방문',
  member_crowd_recommended: '추천',
  
  // Home yoga
  homeYogaTitle: '홈 요가',
};

// Load and inject
let translations = fs.readFileSync(__dirname + '/../src/utils/translations.js', 'utf8');

const endMarker = '    // ═══ END AUTO-INJECTED ═══';
const endPos = translations.indexOf(endMarker);
if (endPos === -1) {
  console.error('Could not find end marker');
  process.exit(1);
}

const newLines = Object.entries(additionalKeys)
  .filter(([k]) => !translations.includes(`    ${k}:`))
  .map(([k, v]) => `    ${k}: "${v.replace(/"/g, '\\"')}",`)
  .join('\n');

translations = translations.slice(0, endPos) + newLines + '\n' + translations.slice(endPos);

fs.writeFileSync(__dirname + '/../src/utils/translations.js', translations);
console.log(`✅ Injected ${Object.keys(additionalKeys).length} additional keys`);
