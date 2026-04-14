const fs = require('fs');
const path = require('path');

const koKeys = {
    member_workout_avg_hr: "평균 심박수",
    member_workout_duration: "운동 시간",
    member_workout_max_hr: "최고 심박수",
    member_workout_close: "닫기"
};

const enKeys = {
    member_workout_avg_hr: "Avg Heart Rate",
    member_workout_duration: "Duration",
    member_workout_max_hr: "Max Heart Rate",
    member_workout_close: "Close"
};

// 1. Write translations
const transFile = path.join(__dirname, '../src/utils/translations.js');
let transContent = fs.readFileSync(transFile, 'utf8');

if (!transContent.includes('member_workout_avg_hr')) {
    const langs = ['ko', 'en', 'ja', 'zh_CN', 'zh_TW', 'fr', 'es', 'vi', 'th', 'hi', 'pt'];
    for (const lang of langs) {
        const isEn = lang === 'en';
        const sourceKeys = isEn ? enKeys : koKeys;
        let injectStr = '\\n        // =============== MEMBER WORKOUT REPORT ===============\\n';
        for (const [k, v] of Object.entries(sourceKeys)) {
             injectStr += '        ' + k + ': ' + JSON.stringify(v) + ',\\n';
        }
        const regex = new RegExp("(" + lang + ":\\\\s*\\\\{)");
        transContent = transContent.replace(regex, "$1" + injectStr);
    }
    fs.writeFileSync(transFile, transContent);
    console.log('[1] Translations written.');
}

// 2. Wrap WorkoutReportModal.jsx
const pPath = path.join(__dirname, '../src/components/profile/WorkoutReportModal.jsx');
let content = fs.readFileSync(pPath, 'utf8');

const replacements = [
    { regex: />평균 심박수</g, replace: ">{t('member_workout_avg_hr') || '평균 심박수'}<" },
    { regex: />운동 시간</g, replace: ">{t('member_workout_duration') || '운동 시간'}<" },
    { regex: />최고 심박수</g, replace: ">{t('member_workout_max_hr') || '최고 심박수'}<" },
    { regex: />\s*닫기\s*<\/button>/g, replace: ">\n                    {t('member_workout_close') || '닫기'}\n                </button>" }
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

fs.writeFileSync(pPath, content);
console.log(`[2] WorkoutReportModal.jsx replaced ${matchCount}/${replacements.length} regexes.`);
