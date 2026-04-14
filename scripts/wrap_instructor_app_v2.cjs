const fs = require('fs');
const path = require('path');

const koKeys = {
    // Schedule
    inst_sch_guide: "👇 날짜를 터치하면 상세 시간표를 확인할 수 있어요",
    inst_sch_branch_legend: "📅 지점별 일정 확인",
    inst_sch_no_class: "수업이 없습니다",
    inst_sch_cancelled: "휴강",
    inst_sch_my_class: "내 수업",
    inst_sch_book_ratio: "예약 {bookedCount}/{capacity}",
    inst_sch_res_list: "📋 예약 명단",
    inst_sch_att_list: "👥 출석 명단",
    inst_sch_loading: "조회 중...",
    inst_sch_no_member: "출석 회원이 없습니다",
    inst_sch_free_practice: "자율수련",
    inst_sch_unassigned: "미지정",
    inst_sch_title_class: "수업",
    
    // Page / Navigation
    inst_nav_home: "홈",
    inst_nav_schedule: "일정",
    inst_nav_notice: "공지",
    inst_nav_checkin: "QR출석",
    inst_nav_admin: "관리자",
    inst_page_loading: "스튜디오 정보를 불러오는 중입니다...",
    inst_page_invalid: "유효하지 않은 스튜디오입니다.",
    inst_page_offline: "오프라인 모드입니다. 네트워크 연결을 확인해주세요.",
    inst_page_admin_warn: "접근 권한이 없습니다.",
    
    // Login
    inst_login_welcome: "{name} 강사님 전용 근태 및 일정 관리",
    inst_login_title: "강사 로그인",
    inst_login_ph_name: "이름을 입력하세요",
    inst_login_ph_pin: "PIN 번호 (4자리)",
    inst_login_btn: "로그인",
    inst_login_auth_fail: "로그인 정보가 올바르지 않습니다.",
    inst_login_err: "로그인 중 오류가 발생했습니다.",
    
    // QR Modal
    inst_qr_title: "QR 코드 체크인",
    inst_qr_desc_1: "카메라가 활성화될 때까지 잠시 기다려주세요.",
    inst_qr_desc_2: "기기의 카메라 권한을 확인해주세요.",
    inst_qr_scan_guide_1: "회원님의 QR 코드를",
    inst_qr_scan_guide_2: "스캔해 주세요",
    inst_qr_scanned: "QR 코드 인식 성공!",
    inst_qr_err_camera_1: "카메라를 시작할 수 없습니다: ",
    inst_qr_err_camera_2: "카메라 접근 권한이 필요합니다.",
    inst_qr_close: "닫기"
};

const enKeys = {
    // Schedule
    inst_sch_guide: "👇 Tap a date to view the detailed schedule",
    inst_sch_branch_legend: "📅 View calendar by branch",
    inst_sch_no_class: "No classes scheduled",
    inst_sch_cancelled: "Cancelled",
    inst_sch_my_class: "My Class",
    inst_sch_book_ratio: "Booked {bookedCount}/{capacity}",
    inst_sch_res_list: "📋 Booking List",
    inst_sch_att_list: "👥 Attendance List",
    inst_sch_loading: "Loading...",
    inst_sch_no_member: "No members attended",
    inst_sch_free_practice: "Open Gym",
    inst_sch_unassigned: "Unassigned",
    inst_sch_title_class: "Classes",
    
    // Page / Navigation
    inst_nav_home: "Home",
    inst_nav_schedule: "Schedule",
    inst_nav_notice: "Notice",
    inst_nav_checkin: "QR Scan",
    inst_nav_admin: "Admin",
    inst_page_loading: "Loading studio information...",
    inst_page_invalid: "Invalid studio.",
    inst_page_offline: "Offline Mode. Please check connection.",
    inst_page_admin_warn: "Permission denied.",
    
    // Login
    inst_login_welcome: "{name} Instructor Dashboard",
    inst_login_title: "Instructor Login",
    inst_login_ph_name: "Enter your name",
    inst_login_ph_pin: "PIN code (4 digits)",
    inst_login_btn: "Log In",
    inst_login_auth_fail: "Invalid login credentials.",
    inst_login_err: "An error occurred during login.",
    
    // QR Modal
    inst_qr_title: "QR Check-In",
    inst_qr_desc_1: "Please wait while the camera initializes.",
    inst_qr_desc_2: "Please check camera permissions.",
    inst_qr_scan_guide_1: "Scan member's",
    inst_qr_scan_guide_2: "QR code here",
    inst_qr_scanned: "QR Scanned Successfully!",
    inst_qr_err_camera_1: "Camera start failed: ",
    inst_qr_err_camera_2: "Camera permission required.",
    inst_qr_close: "Close"
};


const transFile = path.join(__dirname, '../src/utils/translations.js');
let transContent = fs.readFileSync(transFile, 'utf8');

if (!transContent.includes('inst_sch_guide')) {
    const langs = ['ko', 'en', 'ja', 'zh_CN', 'zh_TW', 'fr', 'es', 'vi', 'th', 'hi', 'pt'];
    for (const lang of langs) {
        let injectStr = '\\n        // =============== INSTRUCTOR SHARED ===============\\n';
        const sourceKeys = lang === 'en' ? enKeys : koKeys;
        for (const [k, v] of Object.entries(sourceKeys)) {
            injectStr += '        ' + k + ': ' + JSON.stringify(v) + ',\\n';
        }
        const regex = new RegExp("(" + lang + ":\\\\s*\\\\{)");
        transContent = transContent.replace(regex, "$1" + injectStr);
    }
    fs.writeFileSync(transFile, transContent);
    console.log('[1] Instructor Shared Translations injected.');
}

function processComponent(targetPath, replacements) {
    if (!fs.existsSync(targetPath)) return;
    let content = fs.readFileSync(targetPath, 'utf8');
    let matchCount = 0;
    
    // Add useLanguageStore if not present
    if (!content.includes('useLanguageStore')) {
        content = content.replace(/(import .* from 'react';)/, "$1\\nimport { useLanguageStore } from '../../stores/useLanguageStore';");
        // Also support different folder depths
        content = content.replace("import { useLanguageStore } from '../../stores/useLanguageStore';", "import { useLanguageStore } from '../../../stores/useLanguageStore';"); // Will be fixed below if needed
    }
    
    // Inject hook
    if (!content.includes('const t = useLanguageStore(s => s.t);')) {
        // Standard injection point inside functional component
        content = content.replace(/const ([A-Za-z0-9]+) = \([^=]*\) => \{/, (match) => {
            return match + "\\n    const t = useLanguageStore(s => s.t);";
        });
    }

    for (const r of replacements) {
        const pre = content;
        content = content.replace(r.regex, r.replace);
        if (pre !== content) matchCount++;
    }
    
    // Quick fix for useLanguageStore import path based on depth
    if (targetPath.includes('InstructorQRModal')) {
        content = content.replace("from '../../../stores/", "from '../stores/");
        content = content.replace("from '../../stores/", "from '../stores/");
    } else {
        content = content.replace("from '../../../stores/", "from '../../stores/");
    }

    fs.writeFileSync(targetPath, content);
    console.log(`[2] ${path.basename(targetPath)} replaced ${matchCount}/${replacements.length}`);
}


// --- 1. InstructorSchedule.jsx ---
const schPath = path.join(__dirname, '../src/components/instructor/InstructorSchedule.jsx');
const schRepl= [
    { regex: /'👇 날짜를 터치하면 상세 시간표를 확인할 수 있어요'/g, replace: "(t('inst_sch_guide') || '👇 날짜를 터치하면 상세 시간표를 확인할 수 있어요')" },
    { regex: /'📅 지점별 일정 확인'/g, replace: "(t('inst_sch_branch_legend') || '📅 지점별 일정 확인')" },
    { regex: /'수업이 없습니다'/g, replace: "(t('inst_sch_no_class') || '수업이 없습니다')" },
    { regex: />휴강</g, replace: ">{t('inst_sch_cancelled') || '휴강'}<" },
    { regex: />내 수업</g, replace: ">{t('inst_sch_my_class') || '내 수업'}<" },
    { regex: /예약 \{bookedCount\}\/\{capacity\}/g, replace: "{t('inst_sch_book_ratio', { bookedCount, capacity }) || `예약 ${bookedCount}/${capacity}`}" },
    { regex: /'📋 예약 명단'/g, replace: "(t('inst_sch_res_list') || '📋 예약 명단')" },
    { regex: /'👥 출석 명단'/g, replace: "(t('inst_sch_att_list') || '👥 출석 명단')" },
    { regex: /'조회 중\.\.\.'/g, replace: "(t('inst_sch_loading') || '조회 중...')" },
    { regex: />출석 회원이 없습니다</g, replace: ">{t('inst_sch_no_member') || '출석 회원이 없습니다'}<" },
    { regex: /'자율수련'/g, replace: "(t('inst_sch_free_practice') || '자율수련')" },
    { regex: /'미지정'/g, replace: "(t('inst_sch_unassigned') || '미지정')" },
    { regex: /\{selectedDate\} 수업/g, replace: "{selectedDate} {t('inst_sch_title_class') || '수업'}" },
    // Only doing simple static matches here due to string templates
];
processComponent(schPath, schRepl);

// --- 2. InstructorPage.jsx ---
const pgPath = path.join(__dirname, '../src/pages/InstructorPage.jsx');
const pgRepl = [
    { regex: /'홈'/g, replace: "(t('inst_nav_home') || '홈')" },
    { regex: /'일정'/g, replace: "(t('inst_nav_schedule') || '일정')" },
    { regex: /'공지'/g, replace: "(t('inst_nav_notice') || '공지')" },
    { regex: /'QR출석'/g, replace: "(t('inst_nav_checkin') || 'QR출석')" },
    { regex: /'관리자'/g, replace: "(t('inst_nav_admin') || '관리자')" },
    { regex: />스튜디오 정보를 불러오는 중입니다\.\.\.</g, replace: ">{t('inst_page_loading') || '스튜디오 정보를 불러오는 중입니다...'}<" },
    { regex: />유효하지 않은 스튜디오입니다\.</g, replace: ">{t('inst_page_invalid') || '유효하지 않은 스튜디오입니다.'}<" },
    { regex: />오프라인 모드입니다\. 네트워크 연결을 확인해주세요\.</g, replace: ">{t('inst_page_offline') || '오프라인 모드입니다. 네트워크 연결을 확인해주세요.'}<" },
    { regex: /alert\('접근 권한이 없습니다\.'\)/g, replace: "alert(t('inst_page_admin_warn') || '접근 권한이 없습니다.')" }
];
processComponent(pgPath, pgRepl);

// --- 3. InstructorLogin.jsx ---
const logPath = path.join(__dirname, '../src/components/instructor/InstructorLogin.jsx');
const logRepl = [
    { regex: /'강사 로그인'/g, replace: "(t('inst_login_title') || '강사 로그인')" },
    { regex: /'이름을 입력하세요'/g, replace: "(t('inst_login_ph_name') || '이름을 입력하세요')" },
    { regex: /'PIN 번호 \(4자리\)'/g, replace: "(t('inst_login_ph_pin') || 'PIN 번호 (4자리)')" },
    { regex: /'로그인'/g, replace: "(t('inst_login_btn') || '로그인')" },
    { regex: />로그인</g, replace: ">{t('inst_login_btn') || '로그인'}<" },
    { regex: /'로그인 정보가 올바르지 않습니다\.'/g, replace: "(t('inst_login_auth_fail') || '로그인 정보가 올바르지 않습니다.')" },
    { regex: /'로그인 중 오류가 발생했습니다\.'/g, replace: "(t('inst_login_err') || '로그인 중 오류가 발생했습니다.')" },
    { regex: /\{\s*config\?\.STUDIO_NAME\s*\|\s*'PassFlow'\s*\} 강사님 전용 근태 및 일정 관리/g, replace: "{t('inst_login_welcome', { name: config?.STUDIO_NAME || 'PassFlow' }) || `${config?.STUDIO_NAME || 'PassFlow'} 강사님 전용 근태 및 일정 관리`}" }
];
processComponent(logPath, logRepl);

// --- 4. InstructorQRModal.jsx ---
const qrPath = path.join(__dirname, '../src/components/InstructorQRModal.jsx');
const qrRepl = [
    { regex: />QR 코드 체크인</g, replace: ">{t('inst_qr_title') || 'QR 코드 체크인'}<" },
    { regex: />카메라가 활성화될 때까지 잠시 기다려주세요\.</g, replace: ">{t('inst_qr_desc_1') || '카메라가 활성화될 때까지 잠시 기다려주세요.'}<" },
    { regex: />기기의 카메라 권한을 확인해주세요\.</g, replace: ">{t('inst_qr_desc_2') || '기기의 카메라 권한을 확인해주세요.'}<" },
    { regex: />회원님의 QR 코드를</g, replace: ">{t('inst_qr_scan_guide_1') || '회원님의 QR 코드를'}<" },
    { regex: />스캔해 주세요</g, replace: ">{t('inst_qr_scan_guide_2') || '스캔해 주세요'}<" },
    { regex: />QR 코드 인식 성공!</g, replace: ">{t('inst_qr_scanned') || 'QR 코드 인식 성공!'}<" },
    { regex: /alert\('카메라를 시작할 수 없습니다: ' \+ err\)/g, replace: "alert((t('inst_qr_err_camera_1') || '카메라를 시작할 수 없습니다: ') + err)" },
    { regex: /alert\('카메라 접근 권한이 필요합니다\.'\)/g, replace: "alert(t('inst_qr_err_camera_2') || '카메라 접근 권한이 필요합니다.')" },
    { regex: />닫기</g, replace: ">{t('inst_qr_close') || '닫기'}<" }
];
processComponent(qrPath, qrRepl);

console.log('Instructor app wrapping phase 2 complete!');
