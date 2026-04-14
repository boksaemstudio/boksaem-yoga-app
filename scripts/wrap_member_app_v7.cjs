const fs = require('fs');
const path = require('path');

const koKeys = {
    member_price_copy: "📋 복사하기",
    member_price_copy_fail: "복사 기능을 지원하지 않는 브라우저입니다. 직접 텍스트를 선택해 복사해주세요."
};

const enKeys = {
    member_price_copy: "📋 Copy",
    member_price_copy_fail: "Your browser does not support copying. Please select the text manually."
};

// 1. Write translations
const transFile = path.join(__dirname, '../src/utils/translations.js');
let transContent = fs.readFileSync(transFile, 'utf8');

if (!transContent.includes('member_price_copy')) {
    const langs = ['ko', 'en', 'ja', 'zh_CN', 'zh_TW', 'fr', 'es', 'vi', 'th', 'hi', 'pt'];
    for (const lang of langs) {
        const isEn = lang === 'en';
        const sourceKeys = isEn ? enKeys : koKeys;
        let injectStr = '\\n        // =============== MEMBER PRICE TAB ===============\\n';
        for (const [k, v] of Object.entries(sourceKeys)) {
             injectStr += '        ' + k + ': ' + JSON.stringify(v) + ',\\n';
        }
        const regex = new RegExp("(" + lang + ":\\\\s*\\\\{)");
        transContent = transContent.replace(regex, "$1" + injectStr);
    }
    fs.writeFileSync(transFile, transContent);
    console.log('[1] Translations written.');
}

// 2. Wrap PriceTab.jsx
const pPath = path.join(__dirname, '../src/components/profile/tabs/PriceTab.jsx');
let content = fs.readFileSync(pPath, 'utf8');

const replacements = [
    { regex: />📋 복사하기<\/span>/g, replace: ">{t('member_price_copy') || '📋 복사하기'}</span>" },
    { regex: /'복사 기능을 지원하지 않는 브라우저입니다\. 직접 텍스트를 선택해 복사해주세요\.'/g, replace: "(t('member_price_copy_fail') || '복사 기능을 지원하지 않는 브라우저입니다. 직접 텍스트를 선택해 복사해주세요.')" }
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
console.log(`[2] PriceTab.jsx replaced ${matchCount}/${replacements.length} regexes.`);
