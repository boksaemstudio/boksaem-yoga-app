/**
 * 영어 번역 사전에서 한국어 값이 남아 있는 키를 전수 추출하는 스크립트
 * "값"에 한글이 포함된 경우를 찾으며, 키 자체가 한글인 경우는 제외 (정상)
 */
const fs = require('fs');
const path = require('path');

const file = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'translations.js'), 'utf8');

// en 섹션 추출 (en: { ... } 부분)
// 파일구조: translations = { ko: {...}, en: {...}, ja: {...}, ... }
const enMatch = file.match(/\ben\s*:\s*\{([\s\S]*?)\n\s{4}\},?\s*\n\s{4}(?:ja|zh|es|fr|de|pt|vi|th|ar|hi)\s*:/);
if (!enMatch) {
    console.error('Could not find the en section');
    process.exit(1);
}

const enSection = enMatch[1];
const lines = enSection.split('\n');

const koRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/;
const contaminated = [];

for (const line of lines) {
    // Match: "key": "value" or key: "value"
    const m = line.match(/^\s*"?([^":\n]+)"?\s*:\s*"([^"]*)"/);
    if (!m) continue;
    
    const key = m[1].trim();
    const value = m[2].trim();
    
    // Key가 한국어 자연어인 경우는 의도적 매핑이므로 건너뜀
    if (koRegex.test(key)) continue;
    
    // Value에 한국어가 포함된 경우 = 번역 누수!
    if (koRegex.test(value)) {
        contaminated.push({ key, value });
    }
}

console.log(`\n=== 영어(en) 번역 사전 내 한국어 오염 키 전수 조사 ===`);
console.log(`발견: ${contaminated.length}개\n`);

for (const { key, value } of contaminated) {
    console.log(`  "${key}": "${value}"`);
}

console.log(`\n총 ${contaminated.length}개 키의 영어 번역이 필요합니다.`);
