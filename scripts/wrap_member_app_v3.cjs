const fs = require('fs');
const path = require('path');

const koKeys = {
    member_push_status_fail: "푸시 알림 상태를 확인할 수 없습니다.",
    member_push_no_member: "회원 정보가 없습니다.",
    member_push_resetting: "푸시 알림을 재설정하는 중...",
    member_push_reset_fail: "재설정 실패: ",
    member_push_checking: "푸시 알림 상태 확인 중...",
    member_push_title: "푸시 알림 설정",
    member_push_browser: "브라우저 지원:",
    member_push_browser_ok: "✓ 지원됨",
    member_push_browser_no: "✗ 미지원",
    member_push_perm: "알림 권한:",
    member_push_perm_ok: "✓ 허용됨",
    member_push_perm_no: "✗ 차단됨",
    member_push_perm_unset: "○ 미설정",
    member_push_sw: "Service Worker:",
    member_push_sw_ok: "✓ 활성화",
    member_push_sw_no: "✗ 비활성화",
    member_push_token: "푸시 토큰:",
    member_push_token_ok: "✓ 등록됨",
    member_push_token_no: "✗ 미등록",
    member_push_guide_denied: "브라우저 설정에서 알림을 허용해주세요:",
    member_push_guide_step1: "1. 주소창 왼쪽의 자물쇠(🔒) 아이콘 클릭",
    member_push_guide_step2: "2. 알림 → 허용으로 변경",
    member_push_guide_step3: "3. 페이지 새로고침 후 아래 버튼 클릭",
    member_push_guide_allow: "푸시 알림을 받으려면 아래 버튼을 눌러 설정을 완료해주세요.",
    member_push_btn_resetting: "재설정 중...",
    member_push_btn_reset: "푸시 알림 재설정하기",
    member_push_success: "푸시 알림이 정상적으로 설정되어 있습니다.",
    member_push_btn_re: "재설정"
};

const enKeys = {
    member_push_status_fail: "Failed to check push notification status.",
    member_push_no_member: "No member information found.",
    member_push_resetting: "Resetting push notifications...",
    member_push_reset_fail: "Reset failed: ",
    member_push_checking: "Checking push status...",
    member_push_title: "Push Notification Settings",
    member_push_browser: "Browser Support:",
    member_push_browser_ok: "✓ Supported",
    member_push_browser_no: "✗ Unsupported",
    member_push_perm: "Notification Permission:",
    member_push_perm_ok: "✓ Granted",
    member_push_perm_no: "✗ Denied",
    member_push_perm_unset: "○ Unset",
    member_push_sw: "Service Worker:",
    member_push_sw_ok: "✓ Active",
    member_push_sw_no: "✗ Inactive",
    member_push_token: "Push Token:",
    member_push_token_ok: "✓ Registered",
    member_push_token_no: "✗ Unregistered",
    member_push_guide_denied: "Please allow notifications in your browser settings:",
    member_push_guide_step1: "1. Click the lock (🔒) icon next to the address bar",
    member_push_guide_step2: "2. Change Notifications to Allow",
    member_push_guide_step3: "3. Refresh the page and click the button below",
    member_push_guide_allow: "Tap the button below to enable push notifications.",
    member_push_btn_resetting: "Resetting...",
    member_push_btn_reset: "Reset Push Notifications",
    member_push_success: "Push notifications are properly set up.",
    member_push_btn_re: "Reset"
};

// 1. Write translations
const transFile = path.join(__dirname, '../src/utils/translations.js');
let transContent = fs.readFileSync(transFile, 'utf8');

if (!transContent.includes('member_push_title')) {
    const langs = ['ko', 'en', 'ja', 'zh_CN', 'zh_TW', 'fr', 'es', 'vi', 'th', 'hi', 'pt'];
    for (const lang of langs) {
        const isEn = lang === 'en';
        const sourceKeys = isEn ? enKeys : koKeys;
        let injectStr = '\\n        // =============== MEMBER PUSH UI ===============\\n';
        for (const [k, v] of Object.entries(sourceKeys)) {
             injectStr += '        ' + k + ': ' + JSON.stringify(v) + ',\\n';
        }
        const regex = new RegExp("(" + lang + ":\\\\s*\\\\{)");
        transContent = transContent.replace(regex, "$1" + injectStr);
    }
    fs.writeFileSync(transFile, transContent);
    console.log('[1] Translations written.');
}

// 2. Wrap PushNotificationSettings.jsx
const pnsPath = path.join(__dirname, '../src/components/member/PushNotificationSettings.jsx');
let content = fs.readFileSync(pnsPath, 'utf8');

if (!content.includes('useLanguageStore')) {
    content = content.replace(
        "import { useStudioConfig } from '../../contexts/StudioContext';",
        "import { useStudioConfig } from '../../contexts/StudioContext';\\nimport { useLanguageStore } from '../../stores/useLanguageStore';"
    );
    content = content.replace(
        "const { config } = useStudioConfig();",
        "const { config } = useStudioConfig();\\n    const t = useLanguageStore(s => s.t);"
    );
}

const replacements = [
    { regex: /'푸시 알림 상태를 확인할 수 없습니다\.'/g, replace: "(t('member_push_status_fail') || '푸시 알림 상태를 확인할 수 없습니다.')" },
    { regex: /'회원 정보가 없습니다\.'/g, replace: "(t('member_push_no_member') || '회원 정보가 없습니다.')" },
    { regex: /'푸시 알림을 재설정하는 중\.\.\.'/g, replace: "(t('member_push_resetting') || '푸시 알림을 재설정하는 중...')" },
    { regex: /\`재설정 실패: \$\{error\.message\}\`/g, replace: "`${t('member_push_reset_fail') || '재설정 실패: '}${error.message}`" },
    { regex: /푸시 알림 상태 확인 중\.\.\./g, replace: "{t('member_push_checking') || '푸시 알림 상태 확인 중...'}" },
    
    { regex: /<h3 style=\{styles\.title\}>푸시 알림 설정<\/h3>/g, replace: "<h3 style={styles.title}>{t('member_push_title') || '푸시 알림 설정'}</h3>" },
    
    { regex: /브라우저 지원:/g, replace: "{t('member_push_browser') || '브라우저 지원:'}" },
    { regex: /'✓ 지원됨'/g, replace: "(t('member_push_browser_ok') || '✓ 지원됨')" },
    { regex: /'✗ 미지원'/g, replace: "(t('member_push_browser_no') || '✗ 미지원')" },
    
    { regex: /알림 권한:/g, replace: "{t('member_push_perm') || '알림 권한:'}" },
    { regex: /'✓ 허용됨'/g, replace: "(t('member_push_perm_ok') || '✓ 허용됨')" },
    { regex: /'✗ 차단됨'/g, replace: "(t('member_push_perm_no') || '✗ 차단됨')" },
    { regex: /'○ 미설정'/g, replace: "(t('member_push_perm_unset') || '○ 미설정')" },
    
    { regex: /Service Worker:/g, replace: "{t('member_push_sw') || 'Service Worker:'}" },
    { regex: /'✓ 활성화'/g, replace: "(t('member_push_sw_ok') || '✓ 활성화')" },
    { regex: /'✗ 비활성화'/g, replace: "(t('member_push_sw_no') || '✗ 비활성화')" },
    
    { regex: /푸시 토큰:/g, replace: "{t('member_push_token') || '푸시 토큰:'}" },
    { regex: /'✓ 등록됨'/g, replace: "(t('member_push_token_ok') || '✓ 등록됨')" },
    { regex: /'✗ 미등록'/g, replace: "(t('member_push_token_no') || '✗ 미등록')" },
    
    { regex: /브라우저 설정에서 알림을 허용해주세요:/g, replace: "{t('member_push_guide_denied') || '브라우저 설정에서 알림을 허용해주세요:'}" },
    { regex: /1\.<\/strong> 주소창 왼쪽의 자물쇠\(🔒\) 아이콘 클릭/g, replace: "1.</strong> {t('member_push_guide_step1')?.replace('1. ', '') || '주소창 왼쪽의 자물쇠(🔒) 아이콘 클릭'}" },
    { regex: /2\.<\/strong> 알림 → 허용으로 변경/g, replace: "2.</strong> {t('member_push_guide_step2')?.replace('2. ', '') || '알림 → 허용으로 변경'}" },
    { regex: /3\.<\/strong> 페이지 새로고침 후 아래 버튼 클릭/g, replace: "3.</strong> {t('member_push_guide_step3')?.replace('3. ', '') || '페이지 새로고침 후 아래 버튼 클릭'}" },
    
    { regex: /푸시 알림을 받으려면 아래 버튼을 눌러 설정을 완료해주세요\./g, replace: "{t('member_push_guide_allow') || '푸시 알림을 받으려면 아래 버튼을 눌러 설정을 완료해주세요.'}" },
    
    { regex: /재설정 중\.\.\./g, replace: "{t('member_push_btn_resetting') || '재설정 중...'}" },
    { regex: /푸시 알림 재설정하기/g, replace: "{t('member_push_btn_reset') || '푸시 알림 재설정하기'}" },
    { regex: /푸시 알림이 정상적으로 설정되어 있습니다\./g, replace: "{t('member_push_success') || '푸시 알림이 정상적으로 설정되어 있습니다.'}" },
    { regex: /재설정\n {16}<\/button>/g, replace: "{t('member_push_btn_re') || '재설정'}\n                </button>" }
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

fs.writeFileSync(pnsPath, content);
console.log(`[2] PushNotificationSettings.jsx replaced ${matchCount}/${replacements.length} regexes.`);
