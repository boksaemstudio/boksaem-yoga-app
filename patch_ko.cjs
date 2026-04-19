const fs = require('fs');
const file = 'c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/src/utils/translations.js';
let code = fs.readFileSync(file, 'utf8');

const patchKo = {
  kiosk_info_my_studio: '내 {studioName}',
  kiosk_info_check_credits: '✓ 잔여 횟수 확인',
  kiosk_info_view_schedule: '✓ 수업 일정 보기',
  kiosk_info_get_notifications: '✓ 맞춤 알림 받기',
  kiosk_info_ai_preparing: 'AI가 오늘의 메시지를 준비하고 있어요',
  kiosk_info_checking: '수련 정보를 확인하고 있습니다...',
  kiosk_info_connecting_energy: '{studioName}의 에너지를 연결하고 있습니다...',
  kiosk_info_auto_checkin: '📸 얼굴을 비추면 자동 출석',
  kiosk_info_touch_to_register: '📸 터치하여 얼굴 등록',
  kiosk_info_privacy_mini: '🔐 사진 미저장 · 암호화 128숫자 변환 · 불가역적',
  kiosk_info_auto_checkin_short: '📸 자동 출석',
  kiosk_info_touch_to_register_short: '📸 얼굴 등록',
  kiosk_topbar_instructor: '강사 전용',
  kiosk_topbar_instructor_only: '강사 전용',
  kiosk_topbar_fullscreen_exit: '전체화면 종료',
  kiosk_topbar_fullscreen_enter: '전체화면 모드',
  kiosk_success_welcome: '반갑습니다!',
  kiosk_success_checked_in: '정상적으로 출석되었습니다!',
  kiosk_success_remaining_credits: '잔여 횟수',
  kiosk_success_end_date: '만료일',
  facereg_enter_pin: '얼굴 등록을 위해 출석번호 뒷 4자리를 입력해 주세요',
  inst_page_morning: '좋은 아침입니다',
  inst_page_afternoon: '오늘 하루도 파이팅하세요',
  inst_page_evening: '오늘 하루도 수고 많으셨습니다',
  inst_page_greeting_format: '{name} 선생님, {timeGreeting} 🧘‍♀️ {dayContext}',
  inst_page_day_mon: '활기찬 한 주 시작하세요!',
  inst_page_day_fri: '즐거운 금요일입니다!',
  inst_page_day_weekend: '행복한 주말 보내세요!',
  inst_page_home: '홈',
  inst_page_schedule: '일정',
  inst_page_notices: '공지사항',
  inst_page_logout: '로그아웃',
  inst_page_push_enabled: '알림 수신 중',
  inst_page_push_enable: '알림 받기',
  inst_page_push_enabling: '설정 중...',
  inst_page_loading: '불러오는 중...',
  inst_page_error_load: '데이터를 불러오지 못했습니다.',
  inst_page_attendance_today: '오늘의 출석',
  inst_page_total_classes: '전체 수업',
  inst_page_no_classes: '예정된 수업이 없습니다.',
  kiosk_keypad_instruction: '출석번호 뒷 4자리를 입력해 주세요'
};

const regex = /ko:\s*\{/;
if (regex.test(code)) {
    let injectStr = '';
    for (const [k, v] of Object.entries(patchKo)) {
        injectStr += '    \'' + k + '\': \'' + v.replace(/'/g, "\\'") + '\',\n';
    }
    code = code.replace(regex, "ko: {\n" + injectStr);
    fs.writeFileSync(file, code);
    console.log('Successfully injected 41 missing keys to ko dictionary');
} else {
    console.log('Could not find ko: { in translations.js');
}
