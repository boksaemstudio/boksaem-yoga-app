/**
 * ErrorBoundary + CheckInPage + diligence.js fallback 한국어 → 영어 일괄 교체
 * 
 * 패턴: t("key") || "한국어" → t("key") || "English"
 */
const fs = require('fs');
const path = require('path');

const fallbackFixes = {
    'src/components/common/ErrorBoundary.jsx': {
        '"⚠️ 시스템 오류 발생"': '"⚠️ System Error"',
        '"잠시 후 자동으로 복구됩니다..."': '"Recovering automatically..."',
        '"10초 후 자동 새로고침"': '"Auto-refreshing in 10 seconds"',
        '"자동 복구 시도 횟수 초과"': '"Auto-recovery attempts exceeded"',
        '"지금 새로고침"': '"Refresh Now"',
        '"✨ 업데이트가 완료되었습니다"': '"✨ Update Complete"',
        '"새로운 기능이 배포되어 최신 버전을 불러와야 합니다."': '"A new version has been deployed. Please reload to get the latest features."',
        '"아래 버튼을 눌러 앱을 재시작해주세요."': '"Tap the button below to restart the app."',
        '"앱 재시작 (업데이트 적용)"': '"Restart App (Apply Update)"',
        '"애플리케이션을 불러오는 중 문제가 발생했습니다."': '"Something went wrong while loading the application."',
        '"새로고침 (F5)"': '"Refresh (F5)"',
        '"홈으로 이동"': '"Go to Home"',
    },
    'src/components/checkin/MessageOverlay.jsx': {
        '"닫기"': '"Close"',
        '"화면을 터치하면 출석 화면으로 돌아갑니다"': '"Tap anywhere to return to the check-in screen"',
    },
    'src/pages/CheckInPage.jsx': {
        '"😔 등록되지 않은 번호입니다"': '"😔 Unrecognized Number"',
        '"⏳ 수강권이 만료되었습니다"': '"⏳ Your Pass Has Expired"',
    },
};

let totalFixed = 0;

for (const [file, fixes] of Object.entries(fallbackFixes)) {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ 파일 없음: ${file}`);
        continue;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    let fileFixed = 0;
    
    for (const [oldStr, newStr] of Object.entries(fixes)) {
        if (content.includes(oldStr)) {
            content = content.replace(oldStr, newStr);
            fileFixed++;
        }
    }
    
    if (fileFixed > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${file} — ${fileFixed}건 fallback 교체`);
        totalFixed += fileFixed;
    } else {
        console.log(`ℹ️ ${file} — 변경 없음`);
    }
}

// CheckInPage의 긴 fallback들도 교체
const checkInPath = path.join(__dirname, '..', 'src/pages/CheckInPage.jsx');
if (fs.existsSync(checkInPath)) {
    let content = fs.readFileSync(checkInPath, 'utf8');
    
    const longFixes = [
        [/입력하신 전화번호 뒤 4자리와\\n일치하는 회원을 찾을 수 없습니다\.\\n\\n번호를 다시 확인해 주세요\./g,
         'No member found matching the last 4 digits of this phone number.\\n\\nPlease check and try again.'],
        [/수강권 잔여 횟수가 모두 소진되었습니다\./g,
         'All credits on your pass have been used.'],
        [/👆 출석 화면으로 돌아가려면 터치하세요/g,
         '👆 Tap to return to check-in'],
    ];
    
    let fileFixed = 0;
    for (const [regex, replacement] of longFixes) {
        if (regex.test(content)) {
            content = content.replace(regex, replacement);
            fileFixed++;
        }
    }
    
    if (fileFixed > 0) {
        fs.writeFileSync(checkInPath, content, 'utf8');
        console.log(`✅ CheckInPage — ${fileFixed}건 추가 fallback 교체`);
        totalFixed += fileFixed;
    }
}

console.log(`\n총 ${totalFixed}건 fallback 교체 완료`);
