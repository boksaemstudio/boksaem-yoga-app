/**
 * PassFlow 번역 결과 병합기
 * 
 * 사용법: node scripts/merge_translations.cjs translations_result.json
 * 
 * AI가 번역한 JSON 결과 파일을 받아서 translations.js에 안전하게 병합합니다.
 * 병합 후 변수 템플릿({year}, {days} 등) 무결성을 자동 검증합니다.
 */
const fs = require('fs');
const path = require('path');

const resultFile = process.argv[2];
if (!resultFile) {
    console.error('❌ 사용법: node scripts/merge_translations.cjs <번역결과.json>');
    console.error('   예시: node scripts/merge_translations.cjs translations_result.json');
    process.exit(1);
}

if (!fs.existsSync(resultFile)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${resultFile}`);
    process.exit(1);
}

const tsPath = path.join(__dirname, '..', 'src', 'utils', 'translations.js');
let tsContent = fs.readFileSync(tsPath, 'utf8');
const objectString = tsContent.replace('export const translations =', '').trim().replace(/;$/, '');
let t = new Function('return ' + objectString)();

// 번역 결과 로드
const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
let mergedCount = 0;

for (const [lang, entries] of Object.entries(result)) {
    if (!t[lang]) {
        console.warn(`⚠️  [${lang}] translations.js에 존재하지 않는 언어 — 건너뜀`);
        continue;
    }
    for (const [key, value] of Object.entries(entries)) {
        if (typeof value === 'string' && value.trim() !== '') {
            t[lang][key] = value;
            mergedCount++;
        }
    }
}

// 변수 템플릿 무결성 검증
let brokenVars = 0;
const varRegex = /\{(\w+)\}/g;
for (const [lang, entries] of Object.entries(t)) {
    if (lang === 'en' || lang === 'ko') continue;
    for (const [key, val] of Object.entries(entries)) {
        const enVal = t.en[key];
        if (!enVal) continue;
        
        const enVars = [...enVal.matchAll(varRegex)].map(m => m[1]).sort();
        const localVars = [...val.matchAll(varRegex)].map(m => m[1]).sort();
        
        if (enVars.length > 0 && JSON.stringify(enVars) !== JSON.stringify(localVars)) {
            // 자동 복구: EN의 변수 구조를 기준으로 복원
            let fixed = val;
            for (const v of enVars) {
                if (!fixed.includes(`{${v}}`)) {
                    // 변수가 번역되어 사라진 경우, EN 원문으로 교체
                    t[lang][key] = enVal;
                    brokenVars++;
                    break;
                }
            }
        }
    }
}

// 저장
const finalCode = `export const translations = {\n` +
  Object.keys(t).map(lang => {
    return `  ${lang}: {\n` + Object.keys(t[lang]).map(k => {
        const safeKey = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(k) ? k : JSON.stringify(k);
        return `    ${safeKey}: ${JSON.stringify(t[lang][k])}`;
    }).join(',\n') + `\n  }`;
  }).join(',\n') + `\n};\n`;

fs.writeFileSync(tsPath, finalCode, 'utf8');

// 결과
console.log(`\n✅ 번역 병합 완료: ${mergedCount}건 적용`);
if (brokenVars > 0) {
    console.log(`⚠️  변수 손상 ${brokenVars}건 자동 복구됨 (EN 원문으로 롤백)`);
}

// 파싱 검증
try {
    new Function('return ' + finalCode.replace('export const translations =', '').trim().replace(/;$/, ''))();
    console.log(`✅ translations.js 문법 검증 통과`);
} catch(e) {
    console.error(`❌ translations.js 파싱 실패:`, e.message);
    process.exit(1);
}

// 잔여 현황
const enKeyCount = Object.keys(t.en).length;
for (const lang of ['ja','zh','es','pt','ru','fr','de','vi','th']) {
    const remaining = Object.entries(t.en).filter(([k,v]) => {
        if (!v || v.length <= 1) return false;
        return !t[lang][k] || t[lang][k] === v;
    }).length;
    if (remaining > 0) {
        console.log(`  [${lang}] 잔여 미번역: ${remaining}건`);
    }
}
console.log('');
