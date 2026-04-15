const fs = require('fs');
const c = fs.readFileSync('src/utils/translations.js', 'utf8');

const navKeys = [
    'navAttendance', 'navMembers', 'navRevenue', 'navSchedule',
    'navNotices', 'navAlertHistory', 'navKiosk', 'navPricing',
    'navTrash', 'navAIAssistant', 'navGuide', 'navSettings',
    'navBookings', 'navData'
];

// ko 블록에서 찾기
const koStart = c.indexOf('ko:');
const enStart = c.indexOf('en:');
const koBlock = c.substring(koStart, enStart);

console.log('=== 네비게이션 키 번역 확인 ===');
navKeys.forEach(k => {
    const re = new RegExp('"' + k + '"\\s*:\\s*"([^"]*)"');
    const koMatch = koBlock.match(re);
    const enMatch = c.substring(enStart).match(re);
    console.log(`${k}: ko=${koMatch ? koMatch[1] : '❌ MISSING'} | en=${enMatch ? enMatch[1] : '❌ MISSING'}`);
});
