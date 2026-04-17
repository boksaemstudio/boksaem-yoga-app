const fs = require('fs');

const content = fs.readFileSync('old_translations.js', 'utf8');
const result = {};
const langs = ['ja','zh','es','pt','ru','fr','de','vi','th'];

for (const lang of langs) {
    result[lang] = {};
    const langIdx = content.indexOf(`"${lang}": {`);
    if (langIdx === -1) continue;
    
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
    
    const keyRegex = /"(g_[a-z0-9]+)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    let keyMatch;
    while ((keyMatch = keyRegex.exec(block)) !== null) {
        result[lang][keyMatch[1]] = keyMatch[2];
    }
}

fs.writeFileSync('recovered_g_translations.json', JSON.stringify(result, null, 2), 'utf8');
console.log('Done recovering');
