const fs = require('fs');
const content = fs.readFileSync('src/utils/translations.js', 'utf8');

// 핵심 키 값 확인
const checks = ['expandAll', 'admin_members_loading', 'admin_badge_active', 'collapseAllCards'];
checks.forEach(key => {
    const re = new RegExp('"' + key + '"\\s*:\\s*"([^"]+)"');
    const m = content.match(re);
    console.log(key + ':', m ? m[1] : 'NOT FOUND');
});

// 남은 미번역 (키=값) 체크
let stillBad = 0;
const lines = content.split('\n');
lines.forEach(line => {
    const m = line.match(/"(\w{3,})":\s*"(\w{3,})"/);
    if (m && m[1] === m[2] && !/[\uAC00-\uD7AF]/.test(m[1])) {
        stillBad++;
        if (stillBad <= 10) console.log('  STILL BAD:', m[1]);
    }
});
console.log('Remaining untranslated keys:', stillBad);
