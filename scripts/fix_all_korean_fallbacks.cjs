/**
 * 한국어 FALLBACK → 영어 일괄 변환 스크립트
 * || "한국어" 패턴을 || "English" 로 변환
 * 
 * 모든 t("key") || "한국어" 에서 한국어 fallback을 영어로 교체
 */
const fs = require('fs');
const path = require('path');

// 한국어 → 영어 사전 (자주 사용되는 UI 문자열)
const DICT = {
  // 공통 UI
  '확인': 'Confirm', '취소': 'Cancel', '저장': 'Save', '삭제': 'Delete',
  '닫기': 'Close', '수정': 'Edit', '등록': 'Register', '추가': 'Add',
  '완료': 'Done', '로딩중...': 'Loading...', '검색': 'Search',
  '이전': 'Previous', '다음': 'Next', '더보기': 'More',
  '전체': 'All', '없음': 'None', '선택': 'Select',
  
  // 회원
  '회원': 'Member', '회원명': 'Member Name', '이름': 'Name',
  '전화번호': 'Phone', '전화번호 뒤 4자리': 'Last 4 digits of phone',
  '신규': 'New', '재등록': 'Renewal', '만료': 'Expired',
  '활성': 'Active', '비활성': 'Inactive', '잠든 회원': 'Dormant',
  '수강권': 'Membership', '잔여 횟수': 'Remaining Credits',
  '시작일': 'Start Date', '종료일': 'End Date',
  
  // 출석
  '출석': 'Attendance', '출석 확인': 'Check-in Confirmed',
  '출석체크': 'Check-in', '체크인': 'Check-in',
  '출석 기록': 'Attendance Log', '수동 확인': 'Manual Check-in',
  
  // 수업/스케줄
  '수업': 'Class', '스케줄': 'Schedule', '시간표': 'Timetable',
  '강사': 'Instructor', '자율수련': 'Self Practice', '자율수업': 'Open Practice',
  '미지정': 'Unassigned', '정원': 'Capacity',
  
  // 매출/결제
  '매출': 'Revenue', '결제': 'Payment', '금액': 'Amount',
  '원': '', '건': 'cases', '명': 'people', '개': '',
  '가격표': 'Pricing', '가격': 'Price',
  
  // 예약
  '예약': 'Booking', '예약 완료': 'Booking Confirmed',
  '예약 취소': 'Booking Cancelled', '대기': 'Waitlist',
  '내 예약': 'My Bookings', '노쇼': 'No-show',
  
  // 알림
  '알림': 'Notification', '공지': 'Notice', '공지사항': 'Notices',
  '메시지': 'Message', '전송': 'Send', '발송': 'Send',
  
  // 관리자
  '관리자': 'Admin', '원장': 'Owner', '선생님': 'Instructor',
  '선생님 전용': 'Instructor Only', '선생님 선택': 'Select Instructor',
  '관리자 페이지': 'Admin Dashboard',
  
  // 시스템
  '시스템': 'System', '오류': 'Error', '실패': 'Failed', '성공': 'Success',
  '로그인': 'Login', '로그아웃': 'Logout',
  '지움': 'Clear', '초기화': 'Reset',
  
  // 상태
  '진행중': 'In Progress', '대기중': 'Pending', '승인': 'Approved',
  '거부': 'Rejected', '홀딩': 'On Hold', '일시정지': 'Paused',
  '미설정': 'Not set',
  
  // 날짜/시간
  '오늘': 'Today', '어제': 'Yesterday', '이번 주': 'This Week',
  '이번 달': 'This Month', '최근': 'Recent',
  '일': 'Sun', '월': 'Mon', '화': 'Tue', '수': 'Wed',
  '목': 'Thu', '금': 'Fri', '토': 'Sat',
  '년': '', '월': 'month',
  
  // 기타 UI
  '전체 지점': 'All Branches', '지점': 'Branch',
  '마이그레이션': 'Migration', '백업': 'Backup',
  '내요가': 'My Yoga', '규칙적': 'Regular', '불규칙': 'Irregular',
  '재설정 실패': 'Reset Failed',
  '전체화면 종료': 'Exit Fullscreen', '전체화면 시작': 'Enter Fullscreen',
  '확대 보기': 'Zoom In', '드래그하여 이동': 'Drag to move',
  '두 손가락으로 확대 • 더블 탭으로 줌': 'Pinch to zoom • Double tap to zoom',
  '알 수 없는 오류': 'Unknown error',
  
  // PWA
  '출석체크': 'Check-in', '관리자': 'Admin', '내요가': 'My Yoga',
  '선생님': 'Instructor', '로그인': 'Login',
  
  // 에러 메시지
  '이미지를 1개 이상 첨부해주세요.': 'Please attach at least 1 image.',
  '공지사항이 등록되었습니다.': 'Notice has been posted.',
  '공지사항 등록 중 오류가 발생했습니다.': 'Error posting notice.',
  '이미지는 최대 4장까지만 첨부할 수 있습니다.': 'Maximum 4 images allowed.',
  '이름 또는 전화번호가 일치하지 않습니다': 'Name or phone number does not match',
  '인증 중 오류가 발생했습니다.': 'Authentication error occurred.',
  '일치하는 회원 정보가 없습니다.': 'No matching member found.',
  '로그인 중 오류가 발생했습니다.': 'Login error occurred.',
  '인증 실패': 'Authentication Failed',
  '스튜디오 준비 중...': 'Setting up studio...',
  '취소 처리 중 오류가 발생했습니다': 'Error processing cancellation',
  '⚠️ 시스템 오류 발생': '⚠️ System Error',
  '대기 중인 데이터:': 'Pending data:',
  '스튜디오가 즉시 생성되었습니다!': 'Studio created instantly!',
  '✅ 2개월 무료 체험이 시작되었습니다': '✅ 2-month free trial started',
  '내 스튜디오 바로 접속하기': 'Go to my studio now',
  '  - 에러:': '  - Error:',
};

let totalChanges = 0;
let filesChanged = 0;

function processFile(filePath) {
  const ext = path.extname(filePath);
  if (!['.jsx', '.tsx', '.js', '.ts'].includes(ext)) return;
  if (filePath.includes('node_modules') || filePath.includes('dist') || 
      filePath.includes('translations') || filePath.includes('demoLocalization') || 
      filePath.includes('demoDataEngine') || filePath.includes('scripts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  let fileChanges = 0;

  // Pattern: || "한국어"  or || '한국어'
  Object.entries(DICT).forEach(([kr, en]) => {
    if (!kr || !content.includes(kr)) return;
    
    // Replace || "한국어"
    const pattern1 = `|| "${kr}"`;
    const replace1 = `|| "${en}"`;
    if (content.includes(pattern1) && pattern1 !== replace1) {
      content = content.split(pattern1).join(replace1);
      changed = true;
      fileChanges++;
    }
    
    // Replace || '한국어'
    const pattern2 = `|| '${kr}'`;
    const replace2 = `|| '${en}'`;
    if (content.includes(pattern2) && pattern2 !== replace2) {
      content = content.split(pattern2).join(replace2);
      changed = true;
      fileChanges++;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalChanges += fileChanges;
    filesChanged++;
    console.log(`  ✅ ${path.relative(process.cwd(), filePath)} (${fileChanges} replacements)`);
  }
}

function scanDir(dir) {
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !['node_modules', 'dist', '.git'].includes(item)) {
      scanDir(fullPath);
    } else if (stat.isFile()) {
      processFile(fullPath);
    }
  });
}

console.log('🔄 한국어 FALLBACK → 영어 일괄 변환 시작...\n');
scanDir(path.join(__dirname, '..', 'src'));
console.log(`\n📊 완료: ${filesChanged}개 파일, ${totalChanges}개 문자열 변환`);
