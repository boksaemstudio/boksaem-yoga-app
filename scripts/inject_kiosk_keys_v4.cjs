const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/utils/translations.js');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('kiosk_info_auto_checkin')) {
    const koKeys = {
        kiosk_info_auto_checkin: "📸 얼굴을 비추면 자동 출석",
        kiosk_info_touch_to_register: "📸 터치하여 얼굴 등록",
        kiosk_info_privacy_mini: "🔐 사진 미저장 · 암호화 128숫자 변환 · 불가역적",
        kiosk_info_ai_preparing: "AI가 오늘의 메시지를 준비하고 있어요",
        kiosk_info_checking: "수련 정보를 확인하고 있습니다...",
        kiosk_info_connecting_energy: "{studioName}의 에너지를 연결하고 있습니다...",
        kiosk_info_auto_checkin_short: "📸 자동 출석",
        kiosk_info_touch_to_register_short: "📸 얼굴 등록",
        kiosk_info_my_studio: "내 {studioName}",
        kiosk_info_check_credits: "✓ 잔여 횟수 확인",
        kiosk_info_view_schedule: "✓ 수업 일정 보기",
        kiosk_info_get_notifications: "✓ 맞춤 알림 받기",

        kiosk_guide_title: "📲 앱 설치 안내",
        kiosk_guide_desc: "홈 화면에 앱을 추가해두고 언제든 바로 실행하세요.",
        kiosk_guide_android_browser_req: "Chrome(크롬) 브라우저에서 진행을 권장합니다.",
        kiosk_guide_android_step1_title: "메뉴 버튼 터치",
        kiosk_guide_android_step1_desc: "Chrome 브라우저 우측 상단의 점 3개(⋮) 메뉴를 누르세요.",
        kiosk_guide_step2_title: "'홈 화면에 추가' 선택",
        kiosk_guide_android_step2_desc: "목록에서 '홈 화면에 추가' 또는 '앱 설치'를 찾아 선택하세요.",
        kiosk_guide_step3_title: "바탕화면 확인",
        kiosk_guide_android_step3_desc: "화면에 나오는 설치 버튼을 누르면, 홈 화면에 앱 아이콘이 생성됩니다.",
        kiosk_guide_install_btn: "설치",
        kiosk_guide_ios_browser_req: "Safari(사파리) 브라우저에서만 가능합니다.",
        kiosk_guide_ios_step1_title: "공유 버튼 터치",
        kiosk_guide_ios_step1_desc: "Safari 상단(또는 우측 상단)의 공유 아이콘(↑ 네모)을 누르세요.",
        kiosk_guide_ios_step2_desc: "메뉴를 위로 끌어올려 '홈 화면에 추가' 항목을 선택하세요.",
        kiosk_guide_ios_step3_desc: "우측 상단의 '추가'를 누르면, 홈 화면에 앱 아이콘이 생성됩니다.",
        kiosk_guide_add_btn: "추가"
    };
    
    const enKeys = {
        kiosk_info_auto_checkin: "📸 Face the camera to check in",
        kiosk_info_touch_to_register: "📸 Touch to register your face",
        kiosk_info_privacy_mini: "🔐 No photos saved · 128-point encryption · Irreversible",
        kiosk_info_ai_preparing: "AI is preparing today's message for you",
        kiosk_info_checking: "Checking your pass information...",
        kiosk_info_connecting_energy: "Connecting to the energy of {studioName}...",
        kiosk_info_auto_checkin_short: "📸 Auto Check-in",
        kiosk_info_touch_to_register_short: "📸 Register Face",
        kiosk_info_my_studio: "My {studioName}",
        kiosk_info_check_credits: "✓ Check remaining credits",
        kiosk_info_view_schedule: "✓ View class schedule",
        kiosk_info_get_notifications: "✓ Receive custom alerts",

        kiosk_guide_title: "📲 App Installation Guide",
        kiosk_guide_desc: "Add the app to your home screen for quick access anytime.",
        kiosk_guide_android_browser_req: "We recommend using the Chrome browser.",
        kiosk_guide_android_step1_title: "Tap the Menu Button",
        kiosk_guide_android_step1_desc: "Tap the 3 dots (⋮) menu button in the top right corner of Chrome.",
        kiosk_guide_step2_title: "Select 'Add to Home Screen'",
        kiosk_guide_android_step2_desc: "Find and select 'Add to Home Screen' or 'Install App' from the menu.",
        kiosk_guide_step3_title: "Check Your Home Screen",
        kiosk_guide_android_step3_desc: "Tap the install button that appears, and the app icon will be created on your home screen.",
        kiosk_guide_install_btn: "Install",
        kiosk_guide_ios_browser_req: "Available only in the Safari browser.",
        kiosk_guide_ios_step1_title: "Tap the Share Button",
        kiosk_guide_ios_step1_desc: "Tap the share icon (↑ square) at the top or bottom of Safari.",
        kiosk_guide_ios_step2_desc: "Swipe up the menu and select 'Add to Home Screen'.",
        kiosk_guide_ios_step3_desc: "Tap 'Add' in the top right corner, and the app icon will be created on your home screen.",
        kiosk_guide_add_btn: "Add"
    };

    const langs = ['ko', 'en', 'ja', 'zh_CN', 'zh_TW', 'fr', 'es', 'vi', 'th', 'hi', 'pt'];
    
    for (const lang of langs) {
        const isEn = lang === 'en';
        const sourceKeys = isEn ? enKeys : koKeys;
        
        let injectStr = '\\n        // =============== KIOSK INFO & GUIDE UI ===============\\n';
        for (const [k, v] of Object.entries(sourceKeys)) {
             injectStr += '        ' + k + ': ' + JSON.stringify(v) + ',\\n';
        }

        const regex = new RegExp("(" + lang + ":\\\\s*\\\\{)");
        content = content.replace(regex, "$1" + injectStr);
    }

    fs.writeFileSync(file, content);
    console.log('Successfully injected Kiosk Info keys into translations.js for all languages.');
} else {
    console.log('Keys already exist.');
}
