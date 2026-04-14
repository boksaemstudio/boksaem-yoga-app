/**
 * AUTO-FIX: Generate Korean fallbacks for all missing named keys
 * by finding the Korean fallback string next to each t() call
 */
const fs = require('fs');
const path = require('path');

// Load existing translations
const translationsContent = fs.readFileSync('src/utils/translations.js', 'utf8');

// Extract all defined keys
const definedKeys = new Set();
const keyRegex = /['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\s*:/g;
let match;
while ((match = keyRegex.exec(translationsContent)) !== null) {
  definedKeys.add(match[1]);
}

function scanDir(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory() && !['node_modules','dist','.git','scripts'].includes(f.name)) files.push(...scanDir(p));
    else if (f.isFile() && (f.name.endsWith('.jsx')||f.name.endsWith('.js')||f.name.endsWith('.ts')||f.name.endsWith('.tsx')) && !f.name.includes('.cjs') && !f.name.includes('.test.')) files.push(p);
  }
  return files;
}

const allFiles = scanDir('src');
const keyToKorean = {}; // key -> Korean string

for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Pattern: t('namedKey') - find the Korean text nearby
    // 1. t('key') || "한국어"
    // 2. t('key') || t("g_xxx") || "한국어"
    // 3. t("g_xxx") in same expression gives us a hash key -> lookup in translations
    // 4. JSX: >{t('key')}</  -> Look for Korean text context
    
    const tCallRegex = /\bt\s*\(\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\s*\)/g;
    let m;
    while ((m = tCallRegex.exec(line)) !== null) {
      const key = m[1];
      if (key.startsWith('g_')) continue;
      if (definedKeys.has(key)) continue;
      
      // Try to find Korean fallback in same line
      // Pattern: t('key') || "Korean string"
      const afterCall = line.substring(m.index + m[0].length);
      const koreanMatch = afterCall.match(/\|\|\s*["']([\u3000-\u9FFF\uAC00-\uD7AF\u1100-\u11FF\uF900-\uFAFF\s\w\-\(\)\/\*\.!?%:,~·]+)["']/);
      if (koreanMatch) {
        keyToKorean[key] = koreanMatch[1];
        continue;
      }
      
      // Pattern: t('key') || t("g_xxx") || "Korean"
      const hashMatch = afterCall.match(/\|\|\s*t\s*\(\s*["'](g_[a-f0-9]+)["']\s*\)\s*\|\|\s*["']([\u3000-\u9FFF\uAC00-\uD7AF\u1100-\u11FF\uF900-\uFAFF\s\w\-\(\)\/\*\.!?%:,~·]+)["']/);
      if (hashMatch) {
        keyToKorean[key] = hashMatch[2];
        continue;
      }

      // Unicode escape fallback
      const unicodeMatch = afterCall.match(/\|\|\s*"((?:\\u[0-9A-Fa-f]{4})+)"/);
      if (unicodeMatch) {
        try {
          const decoded = JSON.parse(`"${unicodeMatch[1]}"`);
          keyToKorean[key] = decoded;
        } catch (e) {}
        continue;
      }
      
      // If no fallback found, use the key name as a hint for manual translation
      if (!keyToKorean[key]) {
        keyToKorean[key] = null; // needs manual assignment
      }
    }
  }
}

// Generate smart Korean defaults for common keys
const knownTranslations = {
  // Admin Nav
  navAttendance: '출석',
  navMembers: '회원',
  navRevenue: '매출',
  navSchedule: '시간표',
  navBookings: '예약',
  navNotices: '공지',
  navAlertHistory: '알림',
  navKiosk: '키오스크',
  navPricing: '가격',
  navData: '데이터',
  navTrash: '휴지통',
  navAIAssistant: 'AI 도우미',
  navGuide: '가이드',
  navSettings: '설정',
  
  // Days
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
  
  // Common
  unlimited: '무제한',
  won: '원',
  times: '회',
  ticket: '회원권',
  loading: '로딩 중...',
  processing: '처리 중...',
  close: '닫기',
  cancel: '취소',
  confirm: '확인',
  save: '저장',
  delete: '삭제',
  edit: '수정',
  recent: '최근',
  
  // Profile tabs
  tabHome: '홈',
  tabHistory: '출석기록',
  tabSchedule: '시간표',
  tabPrices: '가격',
  tabNotices: '공지',
  tabMessages: '메시지',
  
  // Member profile
  remainingCredits: '잔여 횟수',
  recentAttendance: '최근 출석',
  viewAll: '전체보기',
  viewCalendar: '달력 보기',
  viewWeekly: '주간 보기',
  pushNotification: '푸시 알림',
  pushOnLabel: '켜짐',
  pushOffLabel: '꺼짐',
  pushSetSuccess: '알림 설정이 변경되었습니다.',
  pushSetFail: '알림 설정에 실패했습니다.',
  pushTurnOffConfirm: '알림을 끄시겠습니까?',
  
  // Attendance
  selfPractice: '자율수련',
  totalAttendance: '총 출석',
  yes_thats_me: '네, 맞습니다',
  
  // Revenue & stats
  todayActivityLog: '오늘의 출석 기록',
  
  // Settings
  settingUp: '설정 중...',
  pushNotificationTitle: '푸시 알림',
  pushNotificationDesc: '출석 및 공지 알림을 받습니다.',
  
  // Season/Time
  season_spring: '봄',
  season_summer: '여름',
  season_autumn: '가을',
  season_winter: '겨울',
  trad_dawn: '새벽',
  trad_morning: '아침',
  trad_afternoon: '오후',
  trad_evening: '저녁',
  trad_night: '밤',
  
  // Pricing
  tuitionFee: '수강료',
  ticketType: '회원권 종류',
  threeMonthDiscount: '3개월 할인',
  sixMonthDiscount: '6개월 할인',
  
  // Schedule
  scheduleTitle: '수업 시간표',
  scheduleSub: '수업 시간을 확인하세요',
  timetableLabel: '시간표',
  
  // Stats
  stats_title: '통계',
  stats_empty: '통계 데이터가 없습니다',

  // Report
  workoutReport: '운동 리포트',
  
  // Sales
  statusActive: '유효',
  statusExpired: '만료',
  statusPending: '대기',
  statusNone: '없음',
  startDate: '시작일',
  remainCount: '잔여 횟수',
  
  // Messages
  viewNotice: '공지 보기',
  
  // Instructor
  system_privacy: '개인정보 처리방침',
  
  // AI
  todayWisdom: '오늘의 지혜',
  
  // Error
  unknownError: '알 수 없는 오류가 발생했습니다.',
};

// Merge
Object.entries(knownTranslations).forEach(([k, v]) => {
  keyToKorean[k] = v;
});

// Output as JSON for injection
const missing = {};
Object.entries(keyToKorean).forEach(([k, v]) => {
  if (!definedKeys.has(k) && v) {
    missing[k] = v;
  }
});

console.log(`\n총 ${Object.keys(missing).length}개 키에 한국어 매핑 완료\n`);

// Print missing keys still without translation
const stillMissing = Object.entries(keyToKorean).filter(([k, v]) => !definedKeys.has(k) && !v);
if (stillMissing.length > 0) {
  console.log(`⚠️ ${stillMissing.length}개 키에 한국어 매핑 없음:`);
  stillMissing.forEach(([k]) => console.log(`  - ${k}`));
}

// Write the mapping file
fs.writeFileSync('scripts/missing_keys.json', JSON.stringify(missing, null, 2));
console.log('\n✅ scripts/missing_keys.json 생성 완료');
