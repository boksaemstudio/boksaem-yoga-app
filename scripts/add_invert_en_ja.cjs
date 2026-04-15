const fs = require('fs');
let c = fs.readFileSync('src/utils/translations.js', 'utf8');

// EN
const enStart = c.indexOf('    en: {');
const enBrace = c.indexOf('{', enStart + 5);
const enSection = c.substring(enStart, enStart + 5000);
if (!enSection.includes('kiosk_logo_invert')) {
    const keys = '\n        "kiosk_logo_invert": "Invert:",\n        "kiosk_logo_invert_on": "On",\n        "kiosk_logo_invert_off": "Off",';
    c = c.substring(0, enBrace + 1) + keys + c.substring(enBrace + 1);
    console.log('✅ EN keys added');
}

// JA
const jaStart = c.indexOf('    ja: {');
const jaBrace = c.indexOf('{', jaStart + 5);
const jaSection = c.substring(jaStart, jaStart + 5000);
if (!jaSection.includes('kiosk_logo_invert')) {
    const keys = '\n        "kiosk_logo_invert": "反転:",\n        "kiosk_logo_invert_on": "オン",\n        "kiosk_logo_invert_off": "オフ",';
    c = c.substring(0, jaBrace + 1) + keys + c.substring(jaBrace + 1);
    console.log('✅ JA keys added');
}

fs.writeFileSync('src/utils/translations.js', c, 'utf8');
console.log('✅ Done');
