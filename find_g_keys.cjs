const fs = require('fs');
const path = require('path');
const { translations } = require('./src/utils/translations.js');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
const missingInEn = {};
const regex = /t\((?:'|")g_([a-z0-9]+)(?:'|")\)\s*\|\|\s*(?:'|")([^'"]+)(?:'|")/g;

files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    let match;
    while ((match = regex.exec(content)) !== null) {
        const key = 'g_' + match[1];
        const koreanDefault = match[2];
        if (!translations.en[key]) {
            missingInEn[key] = koreanDefault;
        }
    }
});

console.log(JSON.stringify(missingInEn, null, 2));
fs.writeFileSync('missing_g_keys.json', JSON.stringify(missingInEn, null, 2), 'utf8');
