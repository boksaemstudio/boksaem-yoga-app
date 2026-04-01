/**
 * translations.js 중복키 자동 제거 스크립트
 * 
 * 전략: 각 언어 객체 내에서 같은 키가 여러 번 나오면 마지막 값만 유지
 * (JS 객체 의미론에서 마지막 값이 실제 사용되는 값이므로 기존 동작 유지)
 */
const fs = require('fs');
const filePath = 'src/utils/translations.js';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// Track: for each "level" (language section), track keys seen
// We'll find duplicate keys and remove the FIRST occurrence (keep last)
let depth = 0;
let sectionStack = [];
const keyOccurrences = {}; // key -> [lineNumbers]
let currentLang = null;

// Step 1: Parse to find all key occurrences per language section
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Detect language section start (top-level keys of translations object)
    const langMatch = trimmed.match(/^(ko|en|ru|zh|ja)\s*:\s*\{/);
    if (langMatch) {
        currentLang = langMatch[1];
        keyOccurrences[currentLang] = {};
        continue;
    }
    
    // Detect end of language section
    if (currentLang && trimmed === '},') {
        // Could be end of section — check context
    }
    
    if (!currentLang) continue;
    
    // Track key definitions (simple key: value patterns)
    // Match: key: "value",  or  key: "value"
    const keyMatch = trimmed.match(/^(\w+)\s*:/);
    if (keyMatch) {
        const key = keyMatch[1];
        if (!keyOccurrences[currentLang][key]) {
            keyOccurrences[currentLang][key] = [];
        }
        keyOccurrences[currentLang][key].push(i);
    }
}

// Step 2: Find duplicates and mark earlier occurrences for removal
const linesToRemove = new Set();
let totalDuplicates = 0;

for (const [lang, keys] of Object.entries(keyOccurrences)) {
    for (const [key, lineNums] of Object.entries(keys)) {
        if (lineNums.length > 1) {
            // Keep the LAST occurrence, remove earlier ones
            for (let j = 0; j < lineNums.length - 1; j++) {
                linesToRemove.add(lineNums[j]);
                totalDuplicates++;
            }
            console.log(`  ${lang}.${key}: ${lineNums.length} occurrences, removing lines ${lineNums.slice(0, -1).map(n=>n+1).join(', ')}`);
        }
    }
}

console.log(`\nTotal duplicate lines to remove: ${totalDuplicates}`);

// Step 3: Also handle inline duplicates like:
// sun: "일", mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토",
// These need special handling — if the line is being removed, but it contains
// keys that are also defined elsewhere, the line should just be removed entirely

// Step 4: Generate cleaned content
const newLines = [];
for (let i = 0; i < lines.length; i++) {
    if (!linesToRemove.has(i)) {
        newLines.push(lines[i]);
    }
}

// Write back
fs.writeFileSync(filePath, newLines.join('\n'));
console.log(`\n✅ Cleaned ${totalDuplicates} duplicate keys from translations.js`);
console.log(`   Original: ${lines.length} lines → New: ${newLines.length} lines`);
