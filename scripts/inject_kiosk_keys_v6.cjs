const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/utils/translations.js');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('kiosk_keypad_verifying')) {
    const koKeys = {
        kiosk_keypad_verifying: "출석 확인 중...",
        kiosk_keypad_please_wait: "잠시만 기다려주세요",
        kiosk_keypad_system_readying: "출석 시스템 준비 중...",
        kiosk_keypad_instruction: "전화번호 뒤 4자리를 눌러주세요",
        
        kiosk_topbar_instructor: "선생님",
        kiosk_topbar_instructor_only: "선생님 전용",
        kiosk_topbar_fullscreen_enter: "전체화면 시작",
        kiosk_topbar_fullscreen_exit: "전체화면 종료",

        kiosk_overlay_close: "닫기",
        kiosk_overlay_touch_to_return: "화면을 터치하면 출석 화면으로 돌아갑니다"
    };
    
    const enKeys = {
        kiosk_keypad_verifying: "Verifying check-in...",
        kiosk_keypad_please_wait: "Please wait a moment",
        kiosk_keypad_system_readying: "System is getting ready...",
        kiosk_keypad_instruction: "Please enter the last 4 digits of your phone number",
        
        kiosk_topbar_instructor: "Instructor",
        kiosk_topbar_instructor_only: "Instructor Only",
        kiosk_topbar_fullscreen_enter: "Enter Fullscreen",
        kiosk_topbar_fullscreen_exit: "Exit Fullscreen",

        kiosk_overlay_close: "Close",
        kiosk_overlay_touch_to_return: "Touch the screen to return to the check-in page"
    };

    const langs = ['ko', 'en', 'ja', 'zh_CN', 'zh_TW', 'fr', 'es', 'vi', 'th', 'hi', 'pt'];
    
    for (const lang of langs) {
        const isEn = lang === 'en';
        const sourceKeys = isEn ? enKeys : koKeys;
        
        let injectStr = '\\n        // =============== KIOSK EXTRA UI ===============\\n';
        for (const [k, v] of Object.entries(sourceKeys)) {
             injectStr += '        ' + k + ': ' + JSON.stringify(v) + ',\\n';
        }

        const regex = new RegExp("(" + lang + ":\\\\s*\\\\{)");
        content = content.replace(regex, "$1" + injectStr);
    }

    fs.writeFileSync(file, content);
    console.log('Successfully injected Kiosk Extra keys into translations.js for all languages.');
} else {
    console.log('Keys already exist.');
}
