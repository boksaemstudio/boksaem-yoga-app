const fs = require('fs');
const glob = require('glob');
// We need to parse translations using babel/parser because it is an ES module
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const transCode = fs.readFileSync('src/utils/translations.js', 'utf8');
const transAst = parser.parse(transCode, { sourceType: 'module' });
const koKeys = new Set();

traverse(transAst, {
    ObjectProperty(path) {
        if (path.parentPath.parentPath?.node?.key?.name === 'ko') {
            koKeys.add(path.node.key.name || path.node.key.value);
        }
    }
});

const files = glob.sync('src/**/*.{js,jsx,ts,tsx}');
const missing = new Set();

files.forEach(f => {
    const code = fs.readFileSync(f, 'utf8');
    const regex = /t\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;
    while ((match = regex.exec(code)) !== null) {
        const key = match[1];
        if (typeof key === 'string' && key.trim() !== '') {
            if (!koKeys.has(key) && !/^g_[a-z0-9]{6}$/.test(key) && !/[\uAC00-\uD7AF]/.test(key)) {
                missing.add(key);
            }
        }
    }
});
console.log('Missing named keys:', Array.from(missing).join(', '));
