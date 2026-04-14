const fs = require('fs');
const content = fs.readFileSync('src/utils/translations.js', 'utf-8');

function extractKeys(langName) {
    const lines = content.split('\n');
    let inBlock = false, bc = 0, keys = {};
    for (const line of lines) {
        if (line.match(new RegExp('^    ' + langName + ': \\{'))) { inBlock = true; bc = 1; continue; }
        if (!inBlock) continue;
        for (const c of line) { if (c === '{') bc++; if (c === '}') bc--; }
        if (bc <= 0) { inBlock = false; continue; }
        const m = line.match(/^\s+(?:"([^"]+)"|'([^']+)'|([a-zA-Z_]\w*))\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/);
        if (m) { const k = m[1] || m[2] || m[3]; const v = m[4] || m[5] || ''; keys[k] = v; }
    }
    return keys;
}

const en = extractKeys('en');
const ru = extractKeys('ru');
const korRe = /[\uAC00-\uD7AF]/;

const missing = Object.keys(en).filter(k => !ru[k] && korRe.test(k));
console.log(`Still missing Korean-text keys: ${missing.length}\n`);
missing.forEach(k => console.log(`"${k}": "${en[k]}",`));
