const fs = require('fs');
const glob = require('glob');

// 1. 코드에서 t('key') (fallback 없이 직접 렌더링)로 사용되는 모든 키 수집
const files = glob.sync('src/**/*.{jsx,js,tsx,ts}', { ignore: ['**/node_modules/**', '**/translations.js'] });
const usedNoFallback = new Set();

files.forEach(f => {
    const code = fs.readFileSync(f, 'utf8');
    // {t('key')} or > {t('key')} < 패턴 (|| fallback 없음)
    const re = /\{t\(['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\)\}/g;
    let m;
    while ((m = re.exec(code)) !== null) {
        // 해당 라인에 || 이 없는지 확인
        const lineStart = code.lastIndexOf('\n', m.index);
        const lineEnd = code.indexOf('\n', m.index);
        const line = code.substring(lineStart, lineEnd);
        if (!line.includes('||')) {
            usedNoFallback.add(m[1]);
        }
    }
});

// 2. translations.js에서 ko/en 키 수집
const transContent = fs.readFileSync('src/utils/translations.js', 'utf8');
const transKeys = new Set();
const keyRe = /"([^"]+)"\s*:/g;
let km;
while ((km = keyRe.exec(transContent)) !== null) {
    transKeys.add(km[1]);
}

// 3. fallback 없이 사용되는데 translations에도 없는 키 = 위험
const dangerous = [];
usedNoFallback.forEach(k => {
    if (!transKeys.has(k)) {
        dangerous.push(k);
    }
});

console.log('Fallback 없는 t() 호출 중 translations에 없는 키 (undefined 위험!):', dangerous.length + '건');
dangerous.sort().forEach(k => console.log('  ❌ ' + k));

// 4. translations에 있는 키 (안전)
const safe = [];
usedNoFallback.forEach(k => {
    if (transKeys.has(k)) safe.push(k);
});
console.log('\nFallback 없지만 translations에 있는 키 (안전):', safe.length + '건');
