const fs = require('fs');

// 1. Git에서 복구한 원본 번역 파일
const original = fs.readFileSync('scripts/translations_backup.js', 'utf8');

// 2. 현재 파일 (내가 주입한 새로운 키들이 포함된 버전)
const current = fs.readFileSync('src/utils/translations.js', 'utf8');

// 원본에서 모든 ko/en 키-값 추출
function extractKeys(content, lang) {
    const map = {};
    // lang: { 로 시작하는 섹션 찾기
    const sectionRe = new RegExp(lang + '\\s*:\\s*\\{');
    const startIdx = content.search(sectionRe);
    if (startIdx === -1) return map;
    
    // 해당 섹션의 모든 key: "value" 추출
    const from = content.indexOf('{', startIdx);
    let braceCount = 0;
    let sectionEnd = from;
    for (let i = from; i < content.length; i++) {
        if (content[i] === '{') braceCount++;
        if (content[i] === '}') braceCount--;
        if (braceCount === 0) { sectionEnd = i; break; }
    }
    const section = content.substring(from, sectionEnd + 1);
    
    // 키-값 파싱
    const kvRe = /["']([^"']+)["']\s*:\s*["']([^"']*)["']/g;
    let m;
    while ((m = kvRe.exec(section)) !== null) {
        map[m[1]] = m[2];
    }
    return map;
}

const origKo = extractKeys(original, 'ko');
const origEn = extractKeys(original, 'en');
const currKo = extractKeys(current, 'ko');
const currEn = extractKeys(current, 'en');

console.log('Original ko keys:', Object.keys(origKo).length);
console.log('Current ko keys:', Object.keys(currKo).length);
console.log('Original en keys:', Object.keys(origEn).length);
console.log('Current en keys:', Object.keys(currEn).length);

// 원본에만 있고 현재에 없는 키 = 손실된 키
const lostKo = {};
Object.keys(origKo).forEach(k => {
    if (!currKo[k]) lostKo[k] = origKo[k];
});

const lostEn = {};
Object.keys(origEn).forEach(k => {
    if (!currEn[k]) lostEn[k] = origEn[k];
});

console.log('Lost ko keys:', Object.keys(lostKo).length);
console.log('Lost en keys:', Object.keys(lostEn).length);

// 손실된 키 복구 - 현재 파일에 추가
if (Object.keys(lostKo).length > 0 || Object.keys(lostEn).length > 0) {
    let result = current;
    
    // ko 섹션에 손실된 키 추가
    if (Object.keys(lostKo).length > 0) {
        const koInsert = Object.entries(lostKo)
            .map(([k, v]) => `        "${k}": "${v}"`)
            .join(',\n');
        // ko: { 다음에 삽입
        result = result.replace(/(ko\s*:\s*\{)/, `$1\n${koInsert},`);
    }
    
    // en 섹션에 손실된 키 추가
    if (Object.keys(lostEn).length > 0) {
        const enInsert = Object.entries(lostEn)
            .map(([k, v]) => `        "${k}": "${v}"`)
            .join(',\n');
        result = result.replace(/(en\s*:\s*\{)/, `$1\n${enInsert},`);
    }
    
    fs.writeFileSync('src/utils/translations.js', result);
    console.log('✅ Restored lost keys!');
    
    // Also merge current-only keys (new ones I added) that aren't in original
    const newKo = {};
    Object.keys(currKo).forEach(k => {
        if (!origKo[k]) newKo[k] = currKo[k];
    });
    console.log('New ko keys (kept):', Object.keys(newKo).length);
} else {
    console.log('No lost keys - file is intact');
}
