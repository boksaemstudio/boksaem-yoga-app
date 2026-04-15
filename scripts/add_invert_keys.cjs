/**
 * 로고 반전 토글 번역 키 추가
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'utils', 'translations.js');
let content = fs.readFileSync(filePath, 'utf8');

const newKeys = {
    ko: {
        kiosk_logo_invert: '반전:',
        kiosk_logo_invert_on: '켜기',
        kiosk_logo_invert_off: '끄기',
    },
    en: {
        kiosk_logo_invert: 'Invert:',
        kiosk_logo_invert_on: 'On',
        kiosk_logo_invert_off: 'Off',
    },
    ja: {
        kiosk_logo_invert: '反転:',
        kiosk_logo_invert_on: 'オン',
        kiosk_logo_invert_off: 'オフ',
    },
};

function inject(content, langCode, keys) {
    const sectionStart = content.indexOf(`    ${langCode}: {`);
    if (sectionStart === -1) { console.log(`⚠️ ${langCode} not found`); return content; }
    const bracePos = content.indexOf('{', sectionStart + 5);
    const firstKey = Object.keys(keys)[0];
    if (content.includes(`"${firstKey}"`)) { console.log(`ℹ️ ${langCode} — already exists`); return content; }
    let keyStr = '\n        // Kiosk Logo Invert Toggle';
    for (const [key, val] of Object.entries(keys)) {
        keyStr += `\n        "${key}": "${val}",`;
    }
    content = content.substring(0, bracePos + 1) + keyStr + content.substring(bracePos + 1);
    console.log(`✅ ${langCode} — ${Object.keys(keys).length} keys added`);
    return content;
}

content = inject(content, 'ko', newKeys.ko);
content = inject(content, 'en', newKeys.en);
content = inject(content, 'ja', newKeys.ja);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Done');
