const fs = require('fs');
const path = require('path');

const koKeys = {
    inst_home_push_not_supported: "❌ 이 브라우저는 알림을 지원하지 않습니다. ",
    inst_home_push_ios_guide: "아이폰은 '홈 화면에 추가'를 통해 앱을 설치해야 알림 설정이 가능합니다.",
    inst_home_push_chrome_guide: "크롬 등 최신 브라우저를 사용해 주세요.",
    inst_home_push_enabled: "✅ 알림이 활성화되었습니다!",
    inst_home_push_token_error: "❌ 토큰을 가져올 수 없습니다.",
    inst_home_push_denied: "❌ 알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.",
    inst_home_push_fail: "❌ 알림 설정 실패: ",
    inst_home_push_disable_guide: "ℹ️ 브라우저 설정에서 알림을 끌 수 있습니다.\\n사이트 설정 > 알림 > 차단",
    inst_home_pwa_ios: "ℹ️ 아이폰: Safari 하단 공유(↑) 클릭 > '홈 화면에 추가'",
    inst_home_pwa_android: "ℹ️ 안드로이드: 브라우저 메뉴(⋮) 클릭 > '앱 설치' 또는 '홈 화면에 추가'",
    inst_home_pwa_other: "ℹ️ 브라우저 메뉴에서 '앱 설치'를 찾아주세요.",
    inst_home_status_upcoming: "예정",
    inst_home_status_inprogress: "진행 중",
    inst_home_status_ended: "종료",
    inst_home_total_attendees: "총 {count}명 출석",
    inst_home_badge_new: "신규",
    inst_home_badge_face_match: "안면일치",
    inst_home_confirm_delete_face: "{name}님의 안면 인식 데이터를 삭제하시겠습니까?\\n\\n삭제 후 키오스크에서 다시 등록할 수 있습니다.",
    inst_home_alert_face_deleted: "안면 인식 데이터가 삭제되었습니다.",
    inst_home_alert_face_delete_fail: "삭제 실패: ",
    inst_home_alert_face_delete_err: "삭제 중 오류가 발생했습니다.",
    inst_home_badge_delete_face: "🧠 안면등록 ✕",
    inst_home_tt_delete_face: "클릭하여 안면 데이터 삭제",
    inst_home_empty_attendance: "출석 데이터가 없습니다",
    inst_home_title_today_attendance: "📋 오늘 나의 수업 출석 현황",
    inst_home_loading: "로딩 중...",
    inst_home_no_schedule_title: "오늘은 수업 일정이 없습니다",
    inst_home_no_schedule_desc: "편안한 휴식과 충전의 시간 되시길 바랍니다!",
    inst_home_attendance_fallback: "출석 현황",
    inst_home_push_section_title: "나의 수업 출석회원 알림",
    inst_home_push_section_desc: "회원 출석 시 알림 받기",
    inst_home_push_on_title: "알림 설정이 켜져 있습니다",
    inst_home_push_on_desc: "토글을 눌러 알림을 끌 수 있습니다.",
    inst_home_push_setting_up: "설정 중... 팝업을 확인해주세요",
    inst_home_push_btn_allow: "🔔 알림 권한 허용하기",
    inst_home_pwa_section_title: "화면에 앱 보관하기",
    inst_home_pwa_desc_ios: "사파리(Safari)에서 홈 화면에 추가할 수 있습니다.",
    inst_home_pwa_desc_other: "하단의 버튼을 누르거나 설치 팝업을 확인하세요.",
    inst_home_pwa_ios_step1_1: "하단 ",
    inst_home_pwa_ios_step1_2: " 공유 버튼",
    inst_home_pwa_ios_step1_3: "을 클릭하세요.",
    inst_home_pwa_ios_step2_1: " 홈 화면에 추가",
    inst_home_pwa_ios_step2_2: "를 선택하세요.",
    inst_home_pwa_btn_install: "폰에 앱 설치하기"
};

const enKeys = {
    inst_home_push_not_supported: "❌ Your browser doesn't support notifications. ",
    inst_home_push_ios_guide: "On iPhone, please 'Add to Home Screen' to enable push notifications.",
    inst_home_push_chrome_guide: "Please use modern browsers like Chrome.",
    inst_home_push_enabled: "✅ Push notifications enabled!",
    inst_home_push_token_error: "❌ Failed to retrieve token.",
    inst_home_push_denied: "❌ Notifications blocked. Please allow in browser settings.",
    inst_home_push_fail: "❌ Push setup failed: ",
    inst_home_push_disable_guide: "ℹ️ You can disable notifications in your browser settings.\\nSite Settings > Notifications > Block",
    inst_home_pwa_ios: "ℹ️ iPhone: Tap Share(↑) at bottom > 'Add to Home Screen'",
    inst_home_pwa_android: "ℹ️ Android: Tap Menu(⋮) > 'Install App' or 'Add to Home Screen'",
    inst_home_pwa_other: "ℹ️ Find 'Install App' in the browser menu.",
    inst_home_status_upcoming: "Upcoming",
    inst_home_status_inprogress: "In Progress",
    inst_home_status_ended: "Ended",
    inst_home_total_attendees: "Total {count} attendees",
    inst_home_badge_new: "New",
    inst_home_badge_face_match: "Face Match",
    inst_home_confirm_delete_face: "Delete facial data for {name}?\\n\\nThey can register again at the kiosk.",
    inst_home_alert_face_deleted: "Facial data deleted successfully.",
    inst_home_alert_face_delete_fail: "Deletion failed: ",
    inst_home_alert_face_delete_err: "An error occurred during deletion.",
    inst_home_badge_delete_face: "🧠 Remove Face ✕",
    inst_home_tt_delete_face: "Click to delete facial data",
    inst_home_empty_attendance: "No attendance data available",
    inst_home_title_today_attendance: "📋 Today's Class Attendance",
    inst_home_loading: "Loading...",
    inst_home_no_schedule_title: "No classes scheduled for today",
    inst_home_no_schedule_desc: "We hope you have a relaxing day!",
    inst_home_attendance_fallback: "Attendance Status",
    inst_home_push_section_title: "Class Attendance Notifications",
    inst_home_push_section_desc: "Get notified when members check-in",
    inst_home_push_on_title: "Notifications are ON",
    inst_home_push_on_desc: "Toggle to disable notifications.",
    inst_home_push_setting_up: "Setting up... Please check the prompt",
    inst_home_push_btn_allow: "🔔 Allow Notifications",
    inst_home_pwa_section_title: "Add App to Home Screen",
    inst_home_pwa_desc_ios: "You can add it to the home screen via Safari.",
    inst_home_pwa_desc_other: "Click the button below or check the install prompt.",
    inst_home_pwa_ios_step1_1: "Tap ",
    inst_home_pwa_ios_step1_2: " Share",
    inst_home_pwa_ios_step1_3: " at the bottom.",
    inst_home_pwa_ios_step2_1: " Add to Home Screen",
    inst_home_pwa_ios_step2_2: " to install.",
    inst_home_pwa_btn_install: "Install App"
};

const transFile = path.join(__dirname, '../src/utils/translations.js');
let transContent = fs.readFileSync(transFile, 'utf8');

if (!transContent.includes('inst_home_push_not_supported')) {
    const langs = ['ko', 'en', 'ja', 'zh_CN', 'zh_TW', 'fr', 'es', 'vi', 'th', 'hi', 'pt'];
    for (const lang of langs) {
        let injectStr = '\\n        // =============== INSTRUCTOR HOME ===============\\n';
        const sourceKeys = lang === 'en' ? enKeys : koKeys;
        for (const [k, v] of Object.entries(sourceKeys)) {
            injectStr += '        ' + k + ': ' + JSON.stringify(v) + ',\\n';
        }
        const regex = new RegExp("(" + lang + ":\\\\s*\\\\{)");
        transContent = transContent.replace(regex, "$1" + injectStr);
    }
    fs.writeFileSync(transFile, transContent);
    console.log('[1] InstructorHome Translations injected.');
}

// 2. Wrap InstructorHome.jsx
const pPath = path.join(__dirname, '../src/components/instructor/InstructorHome.jsx');
let content = fs.readFileSync(pPath, 'utf8');

// UseLanguageStore injection if not present
if (!content.includes('useLanguageStore')) {
    content = content.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';\\nimport { useLanguageStore } from '../../stores/useLanguageStore';");
    content = content.replace("const InstructorHome = ({", "const InstructorHome = ({\\n    const t = useLanguageStore(s => s.t);\\n");
} else {
    if (!content.includes('const t = useLanguageStore(s => s.t);')) {
        content = content.replace("const InstructorHome = ({ instructorName, attendance, attendanceLoading, instructorClasses = [] }) => {", "const InstructorHome = ({ instructorName, attendance, attendanceLoading, instructorClasses = [] }) => {\\n    const t = useLanguageStore(s => s.t);");
    }
}

const replacements = [
    { regex: /'❌ 이 브라우저는 알림을 지원하지 않습니다\. '\s*\+\s*\(deviceOS === 'ios' \? "아이폰은 '홈 화면에 추가'를 통해 앱을 설치해야 알림 설정이 가능합니다\." : "크롬 등 최신 브라우저를 사용해 주세요\."\)/g, replace: "(t('inst_home_push_not_supported') || '❌ 이 브라우저는 알림을 지원하지 않습니다. ') + (deviceOS === 'ios' ? (t('inst_home_push_ios_guide') || \"아이폰은 '홈 화면에 추가'를 통해 앱을 설치해야 알림 설정이 가능합니다.\") : (t('inst_home_push_chrome_guide') || \"크롬 등 최신 브라우저를 사용해 주세요.\"))" },
    { regex: /'✅ 알림이 활성화되었습니다!'/g, replace: "(t('inst_home_push_enabled') || '✅ 알림이 활성화되었습니다!')" },
    { regex: /'❌ 토큰을 가져올 수 없습니다\.'/g, replace: "(t('inst_home_push_token_error') || '❌ 토큰을 가져올 수 없습니다.')" },
    { regex: /'❌ 알림이 차단되었습니다\. 브라우저 설정에서 허용해주세요\.'/g, replace: "(t('inst_home_push_denied') || '❌ 알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.')" },
    { regex: /'❌ 알림 설정 실패: '/g, replace: "(t('inst_home_push_fail') || '❌ 알림 설정 실패: ')" },
    { regex: /'ℹ️ 브라우저 설정에서 알림을 끌 수 있습니다\.\\n사이트 설정 > 알림 > 차단'/g, replace: "(t('inst_home_push_disable_guide') || 'ℹ️ 브라우저 설정에서 알림을 끌 수 있습니다.\\n사이트 설정 > 알림 > 차단')" },
    
    { regex: /'ℹ️ 아이폰: Safari 하단 공유\(↑\) 클릭 > "홈 화면에 추가"'/g, replace: "(t('inst_home_pwa_ios') || 'ℹ️ 아이폰: Safari 하단 공유(↑) 클릭 > \"홈 화면에 추가\"')" },
    { regex: /'ℹ️ 안드로이드: 브라우저 메뉴\(⋮\) 클릭 > "앱 설치" 또는 "홈 화면에 추가"'/g, replace: "(t('inst_home_pwa_android') || 'ℹ️ 안드로이드: 브라우저 메뉴(⋮) 클릭 > \"앱 설치\" 또는 \"홈 화면에 추가\"')" },
    { regex: /'ℹ️ 브라우저 메뉴에서 "앱 설치"를 찾아주세요\.'/g, replace: "(t('inst_home_pwa_other') || 'ℹ️ 브라우저 메뉴에서 \"앱 설치\"를 찾아주세요.')" },
    
    { regex: /label: '예정'/g, replace: "label: (t('inst_home_status_upcoming') || '예정')" },
    { regex: /label: '진행 중'/g, replace: "label: (t('inst_home_status_inprogress') || '진행 중')" },
    { regex: /label: '종료'/g, replace: "label: (t('inst_home_status_ended') || '종료')" },
    
    // UI JSX modifications
    { regex: />총 \{list\.length\}명 출석</g, replace: ">{t('inst_home_total_attendees', { count: list.length }) || `총 ${list.length}명 출석`}<" },
    { regex: />신규</g, replace: ">{t('inst_home_badge_new') || '신규'}<" },
    { regex: />\s*안면일치\s*</g, replace: ">{t('inst_home_badge_face_match') || '안면일치'}<" },
    
    { regex: /confirm\(`\$\{record\.memberName\}님의 안면 인식 데이터를 삭제하시겠습니까\?\\n\\n삭제 후 키오스크에서 다시 등록할 수 있습니다\.`\)/g, replace: "confirm(t('inst_home_confirm_delete_face', { name: record.memberName }) || `${record.memberName}님의 안면 인식 데이터를 삭제하시겠습니까?\\n\\n삭제 후 키오스크에서 다시 등록할 수 있습니다.`)" },
    { regex: /alert\('안면 인식 데이터가 삭제되었습니다\.'\)/g, replace: "alert(t('inst_home_alert_face_deleted') || '안면 인식 데이터가 삭제되었습니다.')" },
    { regex: /alert\('삭제 실패: ' \+ \(result\.error \|\| '알 수 없는 오류'\)\)/g, replace: "alert((t('inst_home_alert_face_delete_fail') || '삭제 실패: ') + (result.error || '알 수 없는 오류'))" },
    { regex: /alert\('삭제 중 오류가 발생했습니다\.'\)/g, replace: "alert(t('inst_home_alert_face_delete_err') || '삭제 중 오류가 발생했습니다.')" },
    { regex: />\s*🧠 안면등록 ✕\s*</g, replace: ">{t('inst_home_badge_delete_face') || '🧠 안면등록 ✕'}<" },
    { regex: /title="클릭하여 안면 데이터 삭제"/g, replace: "title={t('inst_home_tt_delete_face') || '클릭하여 안면 데이터 삭제'}" },
    { regex: />\s*출석 데이터가 없습니다\s*</g, replace: ">{t('inst_home_empty_attendance') || '출석 데이터가 없습니다'}<" },
    { regex: />📋 오늘 나의 수업 출석 현황</g, replace: ">{t('inst_home_title_today_attendance') || '📋 오늘 나의 수업 출석 현황'}<" },
    { regex: />로딩 중\.\.\.</g, replace: ">{t('inst_home_loading') || '로딩 중...'}<" },
    { regex: />오늘은 수업 일정이 없습니다</g, replace: ">{t('inst_home_no_schedule_title') || '오늘은 수업 일정이 없습니다'}<" },
    { regex: />편안한 휴식과 충전의 시간 되시길 바랍니다!</g, replace: ">{t('inst_home_no_schedule_desc') || '편안한 휴식과 충전의 시간 되시길 바랍니다!'}<" },
    { regex: /'출석 현황'/g, replace: "(t('inst_home_attendance_fallback') || '출석 현황')" },
    
    // Push Notifications
    { regex: />나의 수업 출석회원 알림</g, replace: ">{t('inst_home_push_section_title') || '나의 수업 출석회원 알림'}<" },
    { regex: />\s*회원 출석 시 알림 받기\s*</g, replace: ">{t('inst_home_push_section_desc') || '회원 출석 시 알림 받기'}<" },
    { regex: />알림 설정이 켜져 있습니다</g, replace: ">{t('inst_home_push_on_title') || '알림 설정이 켜져 있습니다'}<" },
    { regex: />토글을 눌러 알림을 끌 수 있습니다\.</g, replace: ">{t('inst_home_push_on_desc') || '토글을 눌러 알림을 끌 수 있습니다.'}<" },
    { regex: />\s*설정 중\.\.\. 팝업을 확인해주세요\s*</g, replace: ">{t('inst_home_push_setting_up') || '설정 중... 팝업을 확인해주세요'}<" },
    { regex: />🔔 알림 권한 허용하기</g, replace: '>{t(\'inst_home_push_btn_allow\') || "🔔 알림 권한 허용하기"}<' },
    
    // PWA Section
    { regex: />\s*화면에 앱 보관하기\s*</g, replace: ">{t('inst_home_pwa_section_title') || '화면에 앱 보관하기'}<" },
    { regex: /'사파리\(Safari\)에서 홈 화면에 추가할 수 있습니다\.'/g, replace: "(t('inst_home_pwa_desc_ios') || '사파리(Safari)에서 홈 화면에 추가할 수 있습니다.')" },
    { regex: /'하단의 버튼을 누르거나 설치 팝업을 확인하세요\.'/g, replace: "(t('inst_home_pwa_desc_other') || '하단의 버튼을 누르거나 설치 팝업을 확인하세요.')" },
    { regex: />\s*공유 버튼\s*</g, replace: "><strong style={{fontWeight: 'bold'}}>{t('inst_home_pwa_ios_step1_2') || ' 공유 버튼'}</strong><" },
    { regex: />\s*홈 화면에 추가\s*</g, replace: "><strong style={{fontWeight: 'bold'}}>{t('inst_home_pwa_ios_step2_1') || ' 홈 화면에 추가'}</strong><" },
    { regex: /<span style=\{\{ color: '#e0e0e0' \}\}>하단 <Share/g, replace: "<span style={{ color: '#e0e0e0' }}>{t('inst_home_pwa_ios_step1_1') || '하단 '}<Share" },
    { regex: /<\/strong>을 클릭하세요\.<\/span>/g, replace: "</strong>{t('inst_home_pwa_ios_step1_3') || '을 클릭하세요.'}</span>" },
    { regex: /<\/strong>를 선택하세요\.<\/span>/g, replace: "</strong>{t('inst_home_pwa_ios_step2_2') || '를 선택하세요.'}</span>" },
    { regex: /> 폰에 앱 설치하기</g, replace: ">{t('inst_home_pwa_btn_install') || ' 폰에 앱 설치하기'}<" },
    { regex: /\>총 \{list\.length\}명 출석\</g, replace: ">{t('inst_home_total_attendees').replace('{count}', list.length) || `총 ${list.length}명 출석`}<" },
    
    // Fallback UI interpolation
    { regex: /\{\(record\.credits !== undefined && `\$\{record\.credits\}회 `\)\}/g, replace: "{record.credits !== undefined && `${record.credits}${(t('단위_회') || '회')} `}" }
];

let matchCount = 0;
for (const r of replacements) {
    const originalContent = content;
    content = content.replace(r.regex, r.replace);
    if (content !== originalContent) {
        matchCount++;
    } else {
        console.log("NOT FOUND REGEX: ", r.regex);
    }
}

fs.writeFileSync(pPath, content);
console.log(`[2] InstructorHome.jsx replaced ${matchCount}/${replacements.length} regexes.`);
