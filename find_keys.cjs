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
const missing = new Set();
const regex = /t\((?:'|")([\uAC00-\uD7AF][^'"]*)(?:'|")\)/g;

files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    let match;
    while ((match = regex.exec(content)) !== null) {
        const key = match[1];
        if (!translations.en[key]) {
            missing.add(key);
        }
    }
});

console.log('Missing Korean keys in EN:');
console.log(Array.from(missing).join('\n'));
