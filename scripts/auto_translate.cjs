/**
 * PassFlow 다국어 번역 감지기 (prebuild hook)
 * 
 * 역할: 번역이 필요한 새로운 텍스트를 감지하고 알려주기만 합니다.
 *       번역 자체는 하지 않습니다. 빌드를 차단하지도 않습니다.
 * 
 * 출력물:
 *   - translations_needed.json : 번역이 필요한 키 목록 (AI에게 전달용)
 *   - translations_prompt.md   : AI에 바로 복붙할 수 있는 번역 지시 프롬프트
 */
const fs = require('fs');
const path = require('path');

const tsPath = path.join(__dirname, '..', 'src', 'utils', 'translations.js');
const outDir = path.join(__dirname, '..');

let tsContent = fs.readFileSync(tsPath, 'utf8');
const objectString = tsContent.replace('export const translations =', '').trim().replace(/;$/, '');
let t = new Function('return ' + objectString)();

// 영어 그대로 유지해도 되는 고유명사/브랜드/국제 용어
const ignorableKeys = [
    'ticketType', 'startDate', 'navKiosk', 'management', 'weatherPrefix',
    'class_mysore', 'class_vinyasa', 'class_hatha', 'class_ashtanga',
    'class_inyang', 'healthConnected', 'guideIOS', 'guideAndroid',
    'branchGwangheungchang', 'holiday_chuseok', 'date_header'
];

const langNames = {
    ja: '일본어', zh: '중국어(간체)', es: '스페인어', pt: '포르투갈어(브라질)',
    ru: '러시아어', fr: '프랑스어', de: '독일어', vi: '베트남어', th: '태국어'
};

const langs = ['ja', 'zh', 'es', 'pt', 'ru', 'fr', 'de', 'vi', 'th'];
const needed = {};
let totalCount = 0;

for (const lang of langs) {
    if (!t[lang]) t[lang] = {};
    const missing = [];
    
    for (const [key, enVal] of Object.entries(t.en)) {
        if (!enVal || enVal.length <= 1) continue;
        if (ignorableKeys.includes(key)) continue;
        
        const localVal = t[lang][key];
        if (!localVal || localVal === '' || localVal === enVal) {
            missing.push({ key, en: enVal });
        }
    }
    
    if (missing.length > 0) {
        needed[lang] = missing;
        totalCount += missing.length;
    }
}

if (totalCount === 0) {
    console.log("✨ [i18n] 모든 언어 번역 완료 상태. 추가 작업 없음.");
    process.exit(0);
}

// === 1. JSON 출력 (AI에 전달하거나 스크립트 입력용) ===
const jsonOut = {};
for (const [lang, items] of Object.entries(needed)) {
    jsonOut[lang] = {};
    for (const item of items) {
        jsonOut[lang][item.key] = item.en;
    }
}
fs.writeFileSync(path.join(outDir, 'translations_needed.json'), JSON.stringify(jsonOut, null, 2), 'utf8');

// === 2. AI 프롬프트 생성 ===
let prompt = `# PassFlow 다국어 번역 요청\n\n`;
prompt += `> 아래 영어 텍스트를 각 언어로 번역해주세요.\n`;
prompt += `> 요가/피트니스 스튜디오 관리 SaaS 플랫폼에서 사용되는 UI 텍스트입니다.\n`;
prompt += `> \`{변수명}\` 형태의 템플릿 변수는 절대 번역하지 말고 그대로 유지하세요.\n`;
prompt += `> 결과는 아래와 동일한 JSON 형식으로 출력해주세요.\n\n`;
prompt += `## 출력 형식\n`;
prompt += `\`\`\`json\n{\n  "언어코드": {\n    "키": "번역된 텍스트"\n  }\n}\n\`\`\`\n\n`;

for (const [lang, items] of Object.entries(needed)) {
    prompt += `---\n## ${langNames[lang]} (${lang}) — ${items.length}건\n\n`;
    prompt += `\`\`\`json\n{\n  "${lang}": {\n`;
    prompt += items.map(item => `    "${item.key}": "${item.en}"`).join(',\n');
    prompt += `\n  }\n}\n\`\`\`\n\n`;
}

fs.writeFileSync(path.join(outDir, 'translations_prompt.md'), prompt, 'utf8');

// === 3. 콘솔 요약 ===
console.log(`\n⚠️  [i18n] 번역 필요: ${totalCount}건 감지됨`);
console.log(`─────────────────────────────────`);
for (const [lang, items] of Object.entries(needed)) {
    console.log(`  ${langNames[lang].padEnd(12)} (${lang}): ${items.length}건`);
}
console.log(`─────────────────────────────────`);
console.log(`📄 translations_needed.json  → AI에 전달할 원본 데이터`);
console.log(`📝 translations_prompt.md    → AI에 복붙할 프롬프트`);
console.log(`\n💡 번역 완료 후: node scripts/merge_translations.cjs translations_result.json`);
console.log(``);
