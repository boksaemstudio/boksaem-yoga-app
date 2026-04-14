const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src');
const transFile = path.resolve(srcDir, 'utils/translations.js');

const excludeDirs = ['utils', 'contexts', 'stores', 'services'];
const excludeFiles = ['CommonIcons.jsx'];

function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (!excludeDirs.includes(file)) {
                getAllFiles(filePath, fileList);
            }
        } else if (/\.(jsx?|tsx?)$/.test(file) && !excludeFiles.includes(file)) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const allFiles = getAllFiles(srcDir);
const translationContent = fs.readFileSync(transFile, 'utf-8');

// 1. Extract used keys
const usedKeys = new Set();
let hardcodedKorean = [];

allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Find t('key') or t("key") or t(`key`)
    const tRegex = /(?<!\w)t\(\s*['"`]([^'"`\\]+)['"`]/g;
    let match;
    while ((match = tRegex.exec(content)) !== null) {
        usedKeys.add(match[1]);
    }

    // Find hardcoded Korean. 
    // Basic heuristic: lines with Korean chars that don't have console.log or // comments
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
        if (/[가-힣]/.test(line)) {
            if (line.includes('console.') || line.trim().startsWith('//') || line.includes('/*')) return;
            // Also ignore fallback text inside t('..') || '한글'
            // We can strip out t(...) || '...' and see if Korean remains
            let cleanLine = line.replace(/t\([^)]*\)\s*\|\|\s*['"`][가-힣\s\w.?!\[\]\{\}]+['"`]/g, '');
            // Also ignore t(`med_energy_${...}`) || ... 
            cleanLine = cleanLine.replace(/t\([^)]*\)/g, ''); 
            // basic check if Korean still exists
            if (/[가-힣]/.test(cleanLine)) {
                hardcodedKorean.push({
                    file: path.relative(srcDir, file),
                    line: idx + 1,
                    text: line.trim()
                });
            }
        }
    });
});

console.log(`[Audit] Total used translation keys: ${usedKeys.size}`);

// 2. Load translations.js structure (Parse simply using RegEx because it's a JS file with module.exports)
const langs = ['ko', 'en', 'ja', 'zh', 'ru', 'es', 'pt', 'fr', 'de'];
const keysNotFound = {};
langs.forEach(lang => keysNotFound[lang] = []);

for (const lang of langs) {
    const langHeaderRegex = new RegExp(`^\\s{4}${lang}:\\s*\\{`, 'm');
    const langMatch = translationContent.match(langHeaderRegex);
    if (!langMatch) {
         console.log(`Language block ${lang} not found!`);
         continue;
    }
    let braceCount = 0;
    let closingBracePos = -1;
    for (let i = langMatch.index; i < translationContent.length; i++) {
        if (translationContent[i] === '{') braceCount++;
        if (translationContent[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
                closingBracePos = i;
                break;
            }
        }
    }
    const blockContent = translationContent.slice(langMatch.index, closingBracePos);

    usedKeys.forEach(key => {
        // dynamically constructed keys can't be checked statically (e.g., med_energy_${etc})
        if (key.includes('${')) return; 
        
        const keyRegex = new RegExp(`["']${key}["']\\s*:`);
        if (!keyRegex.test(blockContent)) {
            keysNotFound[lang].push(key);
        }
    });
}

langs.forEach(lang => {
    if (keysNotFound[lang].length > 0) {
        console.log(`[Validation Error] Language '${lang}' is missing ${keysNotFound[lang].length} keys.`);
        console.log(`  -> e.g. ${keysNotFound[lang].slice(0, 5).join(', ')}...`);
    } else {
        console.log(`[Validation Success] Language '${lang}' has 100% of statically analyzable used keys.`);
    }
});

console.log(`\n[Audit] Potential hardcoded Korean lines remaining: ${hardcodedKorean.length}`);
if (hardcodedKorean.length > 0) {
    hardcodedKorean.slice(0, 10).forEach(h => {
        console.log(` - ${h.file}:${h.line} => ${h.text}`);
    });
    if (hardcodedKorean.length > 10) console.log('   ...');
}
