const fs = require('fs');
const p = 'src/hooks/useScheduleData.js';
let c = fs.readFileSync(p, 'utf8');

// Fix L102: 표준 시간표 confirm
const old102 = /const confirmMsg = `📅 \$\{year\}년 \$\{month\}월에[^`]*`;/;
if (old102.test(c)) {
    c = c.replace(old102, 'const confirmMsg = (t("confirm_apply_standard") || `📅 Apply the standard schedule template to ${year}/${month}?`).replace("{year}", year).replace("{month}", month);');
    console.log('✅ L102 표준 시간표 confirm 교체');
} else {
    console.log('ℹ️ L102 이미 수정됨');
}

fs.writeFileSync(p, c, 'utf8');
