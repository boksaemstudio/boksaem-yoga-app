const fs = require('fs');
const path = require('path');

// Service layer Korean → English translation dictionary
const SERVICE_DICT = {
  // bookingService.ts
  '예약 기능이 비활성화되어 있습니다': 'Booking is disabled',
  '예약은 ': 'Bookings open ',
  '일 전부터 가능합니다': ' days before',
  '지난 수업은 예약할 수 없습니다': 'Cannot book past classes',
  '동시에 ': 'Max ',
  '건까지만 예약 가능합니다': ' bookings allowed',
  '하루 ': 'Max ',
  '이미 이 수업에 예약되어 있습니다': 'Already booked for this class',
  '이번 주 ': 'Weekly limit of ',
  '회 수강 제한을 초과합니다': ' sessions exceeded',
  '정원이 찼습니다': 'Class is full',
  '대기 ': 'Waitlisted at position ',
  '번째로 등록되었습니다': '',
  '예약이 완료되었습니다': 'Booking confirmed',
  '예약을 찾을 수 없습니다': 'Booking not found',
  '이미 취소된 예약입니다': 'Already cancelled',
  '예약이 취소되었습니다': 'Booking cancelled',
  '예약 취소 중 에러가 발생했습니다.': 'Error cancelling booking.',
  '출석 처리 중 에러가 발생했습니다.': 'Error processing attendance.',
  '노쇼 처리 중 에러가 발생했습니다.': 'Error processing no-show.',

  // attendanceService.ts
  '자율수련': 'Self Practice',
  '미지정': 'Unassigned',
  '회차 출석되었습니다!': ' check-in!',
  '출석되었습니다!': 'Checked in!',
  '회원': 'Member',

  // classService.ts
  '회원권 기반 매칭: ': 'Membership-based matching: ',
  '수업 예정: ': 'Upcoming class: ',
  '다음 수업 우선: ': 'Next class priority: ',
  '수업 진행 중: ': 'Class in progress: ',
  '조기 출석: ': 'Early check-in: ',
  '현재 수업 없음 → 자율수련': 'No current class → Self Practice',

  // scheduleService.ts
  '관리자 페이지에서 시간표 템플릿을 설정해주세요.': 'Please set up schedule templates in the admin dashboard.',
  '지난달 데이터를 기반으로 새 스케줄이 생성되었습니다.': 'New schedule generated based on last month\'s data.',
  '평일: ': 'Weekdays: ',
  '주차 패턴, 주말: 순차 적용': ' week pattern, Weekends: sequential',

  // studioRegistryService.ts
  '이미 등록된 스튜디오 ID입니다: ': 'Studio ID already registered: ',
  '스튜디오가 등록되었습니다.': 'Studio has been registered.',
  '등록 실패: ': 'Registration failed: ',
  '새 스튜디오 가입: ': 'New studio signup: ',
  '이 PassFlow AI에 가입했습니다. 스튜디오ID: ': ' has joined PassFlow AI. Studio ID: ',

  // authService.ts
  '일치하는 회원 정보가 없습니다.': 'No matching member found.',
  '로그인 중 오류가 발생했습니다.': 'Login error occurred.',
  '인증 실패': 'Authentication Failed',

  // pushService.ts
  'Service Worker 확인 실패: ': 'Service Worker check failed: ',
  '푸시 알림 설정 실패: ': 'Push notification setup failed: ',

  // aiService.ts
  '이탈 위험 회원 ': 'At-risk members ',
  '안녕하세요! 요즘 어떻게 지내세요?': 'Hello! How have you been?',
  '다시 뵙기를 기다리고 있어요': 'We\'re looking forward to seeing you again',

  // creditPolicyUtils.ts
  '이번 주 ': 'This week ',
  '회 남음': ' remaining',

  // adminCalculations.ts
  '월': '',
  '선생님': 'Instructor',

  // onboardingI18n.js
  '의 로고': '\'s Logo',
  '이름에 맞는 로고를 AI가 만들어 드립니다': 'AI will create a logo matching your name',
  '슈퍼어드민이 승인하는 즉시,': 'Once approved by Super Admin,',
  '주소로': 'to the address',
  '초기 비밀번호와 접속 링크를 보내드립니다.': 'we will send the initial password and access link.',

  // meditation views
  '준비 단계': 'Preparation Stage',
  '자세': 'Posture',
  '시간을 가져볼까요? 오늘 하루 마음이 어떠셨나요?': 'Shall we take a moment? How are you feeling today?',
  '님': '',

  // Various modals
  '공지사항 첨부 이미지 ': 'Notice attachment image ',
  '에게 메시지를 전송했습니다.': ' — message sent.',
  '삭제 실패: ': 'Delete failed: ',
  '명': ' people',
  '약 ': 'Approx. ',
  '시간표': 'Schedule',

  // migrationService.ts
  '삭제 중...': 'Deleting...',

  // StudioContext console
  '[스튜디오] 익명 인증 실패, 기본 설정으로 진행:': '[Studio] Anonymous auth failed, using defaults:',
  '[스튜디오] 초기 설정 저장 실패:': '[Studio] Initial config save failed:',
  '[스튜디오] 설정 동기화 오류:': '[Studio] Config sync error:',
  '[스튜디오] 설정 업데이트 실패:': '[Studio] Config update failed:',

  // AI assistant
  'AI가 당신의 마음을 듣고 있어요...': 'AI is listening to your heart...',
};

let totalChanges = 0;
let filesChanged = 0;

function processFile(filePath) {
  const ext = path.extname(filePath);
  if (!['.jsx', '.tsx', '.js', '.ts'].includes(ext)) return;
  if (filePath.includes('node_modules') || filePath.includes('dist') || 
      filePath.includes('translations.js') || filePath.includes('demoLocalization') || 
      filePath.includes('demoDataEngine') || filePath.includes('scripts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  let fileChanges = 0;

  Object.entries(SERVICE_DICT).forEach(([kr, en]) => {
    if (!content.includes(kr)) return;
    
    // Replace in template literals: `한국어`
    if (content.includes(kr)) {
      const before = content;
      content = content.split(kr).join(en);
      if (content !== before) {
        changed = true;
        fileChanges++;
      }
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalChanges += fileChanges;
    filesChanged++;
    console.log(`  ✅ ${path.relative(process.cwd(), filePath)} (${fileChanges} fixes)`);
  }
}

function scanDir(dir) {
  fs.readdirSync(dir).forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !['node_modules', 'dist', '.git'].includes(item)) {
      scanDir(fullPath);
    } else if (stat.isFile()) {
      processFile(fullPath);
    }
  });
}

console.log('🔄 Service layer Korean → English conversion...\n');
scanDir(path.join(__dirname, '..', 'src'));
console.log(`\n📊 Complete: ${filesChanged} files, ${totalChanges} replacements`);
