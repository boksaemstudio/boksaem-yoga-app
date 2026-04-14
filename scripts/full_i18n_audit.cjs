/**
 * 전체 코드베이스 다국어 감사 스크립트
 * - 이중 t(t()) 호출
 * - 하드코딩된 한국어 (t() 미사용)
 * - 번역 키 원문 노출 위험
 * - 빈 텍스트/라벨
 */
const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.{jsx,js,tsx,ts}', { ignore: ['**/node_modules/**', '**/utils/translations.js'] });

let totalIssues = 0;
const issues = {
    doubleT: [],
    hardcodedKorean: [],
    emptyLabels: [],
    mixedLanguage: [],
    brokenFallback: []
};

files.forEach(f => {
    const code = fs.readFileSync(f, 'utf8');
    const lines = code.split('\n');
    const basename = f.replace(/^src\//, '');
    
    lines.forEach((line, i) => {
        const ln = i + 1;
        const trimmed = line.trim();
        
        // 1. 이중 t(t()) 호출
        if (/\bt\(\s*t\(/.test(line)) {
            issues.doubleT.push({ file: basename, line: ln, content: trimmed.substring(0, 80) });
        }
        
        // 2. JSX에서 하드코딩된 한국어 (>한국어< 패턴 - t() 미사용)
        if (/>[\s]*[가-힣]{4,}[\s]*</.test(line) && !line.includes('t(') && !line.includes('//') && !line.includes('{/*')) {
            // 컴포넌트 import나 CSS className이 아닌 실제 텍스트만
            if (!trimmed.startsWith('import') && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
                // 이미 t() || fallback 패턴이면 OK
                if (!line.includes('||')) {
                    issues.hardcodedKorean.push({ file: basename, line: ln, content: trimmed.substring(0, 80) });
                }
            }
        }
        
        // 3. title="" 또는 aria-label=""이 빈 경우
        if (/title\s*=\s*["']\s*["']/.test(line) || /aria-label\s*=\s*["']\s*["']/.test(line)) {
            issues.emptyLabels.push({ file: basename, line: ln, content: trimmed.substring(0, 80) });
        }
        
        // 4. t('key') 호출 후 || 없이 바로 사용 (fallback 없음) - JSX 내에서만
        if (/\{t\(['"][a-z][a-zA-Z_]+['"]\)\}/.test(line)) {
            // t('영어키')가 직접 렌더링 - translations에 없으면 undefined 표시
            const match = line.match(/\{t\(['"]([a-z][a-zA-Z_]+)['"]\)\}/);
            if (match && !line.includes('||')) {
                issues.brokenFallback.push({ file: basename, line: ln, key: match[1], content: trimmed.substring(0, 80) });
            }
        }
    });
});

console.log('═══════════════════════════════════════════════════');
console.log('📊 전체 코드베이스 다국어 감사 결과');
console.log('═══════════════════════════════════════════════════');

console.log(`\n🔴 이중 t(t()) 호출: ${issues.doubleT.length}건`);
issues.doubleT.slice(0, 10).forEach(i => console.log(`   ${i.file}:${i.line} → ${i.content}`));

console.log(`\n🟡 빈 title/aria-label: ${issues.emptyLabels.length}건`);
issues.emptyLabels.slice(0, 10).forEach(i => console.log(`   ${i.file}:${i.line} → ${i.content}`));

console.log(`\n🟠 fallback 없는 t() 호출 (undefined 위험): ${issues.brokenFallback.length}건`);
issues.brokenFallback.slice(0, 20).forEach(i => console.log(`   ${i.file}:${i.line} [${i.key}] → ${i.content}`));

console.log(`\n🟢 하드코딩 한국어 (참고): ${issues.hardcodedKorean.length}건`);
issues.hardcodedKorean.slice(0, 10).forEach(i => console.log(`   ${i.file}:${i.line} → ${i.content}`));

totalIssues = issues.doubleT.length + issues.emptyLabels.length + issues.brokenFallback.length;
console.log(`\n═══════════════════════════════════════════════════`);
console.log(`총 이슈: ${totalIssues}건 (참고 제외)`);
console.log(`═══════════════════════════════════════════════════`);
