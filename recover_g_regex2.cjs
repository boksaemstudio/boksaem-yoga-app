const fs = require('fs');

const content = fs.readFileSync('old_translations_clean.js', 'utf8');
const result = {};
const langs = ['ja','zh','es','pt','ru','fr','de','vi','th'];

for (const lang of langs) {
    result[lang] = {};
    const searchStr = `"${lang}": {`;
    const langIdx = content.indexOf(searchStr);
    if (langIdx === -1) {
        console.log('Not found:', lang);
        continue;
    }
    
    let blockStart = content.indexOf('{', langIdx);
    let blockEnd = blockStart;
    let braces = 1;
    for (let i = blockStart + 1; i < content.length; i++) {
        if (content[i] === '{') braces++;
        if (content[i] === '}') braces--;
        if (braces === 0) {
            blockEnd = i;
            break;
        }
    }
    
    const block = content.substring(blockStart, blockEnd + 1);
    
    // We only care about g_ keys, which are pure ASCII, so no encoding issues.
    const keyRegex = /"(g_[a-z0-9]+)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    let keyMatch;
    let count = 0;
    while ((keyMatch = keyRegex.exec(block)) !== null) {
        result[lang][keyMatch[1]] = keyMatch[2];
        count++;
    }
    console.log(lang, 'found', count);
}

fs.writeFileSync('recovered_g_translations.json', JSON.stringify(result, null, 2), 'utf8');
