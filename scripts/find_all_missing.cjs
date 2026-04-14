const fs = require('fs');
const glob = require('glob');

// 코드에서 t('...')로 사용되는 모든 키 수집
const files = glob.sync('src/**/*.{js,jsx,ts,tsx}');
const usedKeys = new Set();

files.forEach(f => {
    const code = fs.readFileSync(f, 'utf8');
    const regex = /\bt\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let m;
    while ((m = regex.exec(code)) !== null) {
        usedKeys.add(m[1]);
    }
});

// translations.js에서 이미 있는 키 확인
const transContent = fs.readFileSync('src/utils/translations.js', 'utf8');
const existingKeys = new Set();
const keyRe = /"([^"]+)"\s*:/g;
let km;
while ((km = keyRe.exec(transContent)) !== null) {
    existingKeys.add(km[1]);
}

// 코드에서 쓰이지만 translations에 없는 키 (g_ 제외)
const missing = [];
usedKeys.forEach(k => {
    if (!existingKeys.has(k) && !/^g_[a-f0-9]{6}$/.test(k)) {
        missing.push(k);
    }
});

console.log('코드에서만 사용 (translations에 없음):', missing.length + '건');
missing.sort().forEach(k => console.log('  ' + k));
