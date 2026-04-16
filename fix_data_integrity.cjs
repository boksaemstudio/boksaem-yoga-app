const fs = require('fs');
const path = require('path');

const tsPath = path.join(__dirname, 'src', 'utils', 'translations.js');
let tsContent = fs.readFileSync(tsPath, 'utf8');
const objectString = tsContent.replace('export const translations =', '').trim().replace(/;$/, '');
let t = new Function('return ' + objectString)();

const enKeys = new Set(Object.keys(t.en));

// === FIX 1: KO 누락 키 보충 (EN에는 있지만 KO에 없는 키) ===
// 이 키들은 원래 한국어 값을 key 그 자체로 갖고 있음 (한국어 텍스트가 key)
let koFixed = 0;
for (const key of enKeys) {
    if (!t.ko[key]) {
        // 키 자체가 한국어인 경우 (예: "새로운 버전이 준비되었습니다")
        // 이 경우 키 자체가 한국어 번역값
        const isKoreanKey = /[\uAC00-\uD7AF\u1100-\u11FF]/.test(key);
        if (isKoreanKey) {
            t.ko[key] = key; // 키 자체가 한국어 원본 텍스트
        } else {
            // 영어 키인데 KO에 없는 경우 - EN 값을 임시 삽입 (폴백용)
            t.ko[key] = t.en[key];
        }
        koFixed++;
    }
}
console.log(`[KO] ${koFixed}개 누락 키 보충 완료`);

// === FIX 2: TH 초과 키 정리 (EN에 없는 잉여 키 제거) ===
let thCleaned = 0;
const thKeysBefore = Object.keys(t.th).length;
const cleanedTh = {};
for (const key of Object.keys(t.th)) {
    if (enKeys.has(key) || t.ko[key]) {  // EN 또는 KO에 존재하는 키만 유지
        cleanedTh[key] = t.th[key];
    } else {
        thCleaned++;
    }
}
t.th = cleanedTh;
console.log(`[TH] ${thCleaned}개 잉여 키 제거 (${thKeysBefore} -> ${Object.keys(t.th).length})`);

// === 최종 저장 ===
const finalCode = `export const translations = {\n` +
  Object.keys(t).map(lang => {
    return `  ${lang}: {\n` + Object.keys(t[lang]).map(k => {
        const safeKey = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(k) ? k : JSON.stringify(k);
        return `    ${safeKey}: ${JSON.stringify(t[lang][k])}`;
    }).join(',\n') + `\n  }`;
  }).join(',\n') + `\n};\n`;

fs.writeFileSync(tsPath, finalCode, 'utf8');

// === 검증 ===
const verify = new Function('return ' + finalCode.replace('export const translations =', '').trim().replace(/;$/, ''))();
console.log('\n=== 최종 검증 ===');
for (const lang of Object.keys(verify)) {
    console.log(`[${lang}] ${Object.keys(verify[lang]).length} keys`);
}
console.log('✅ 데이터 정합성 수정 완료');
