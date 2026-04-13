const fs = require('fs');

const path = 'src/utils/translations.js';
let content = fs.readFileSync(path, 'utf8');

const enKeys = `
        "새로운 버전이 준비되었습니다": "A new version is ready",
        "새로운 기능 활성화 및 최적화를 위해": "To enable new features and optimizations",
        "지금 업데이트를 진행해주세요.": "Please update now.",
        "업데이트 중...": "Updating...",
        "클릭하여 업데이트 및 재시작": "Click to update and restart",`;

const jaKeys = `
        "새로운 버전이 준비되었습니다": "新しいバージョンが準備されました",
        "새로운 기능 활성화 및 최적화를 위해": "機能の有効化と最適化のために",
        "지금 업데이트를 진행해주세요.": "今すぐアップデートしてください。",
        "업데이트 중...": "アップデート中...",
        "클릭하여 업데이트 및 재시작": "クリックして更新と再起動",`;

if (!content.includes('"새로운 버전이 준비되었습니다"')) {
    content = content.replace(/en:\s*\{/, `en: {\n${enKeys}`);
    content = content.replace(/ja:\s*\{/, `ja: {\n${jaKeys}`);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Translations added successfully.');
} else {
    console.log('Translations already exist.');
}