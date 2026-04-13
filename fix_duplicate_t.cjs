const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) walk(fullPath, fileList);
            else if (file.endsWith('.jsx') || file.endsWith('.js')) fileList.push(fullPath);
        }
    } catch(e) {}
    return fileList;
}

const allFiles = walk('src');
let fixCount = 0;

allFiles.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    // Pattern: component receives `t` as a prop AND also has `const t = useLanguageStore`
    // This causes "symbol t already declared" error
    const hasTInProps = /\(\{[^}]*\bt\b[^}]*\}\)\s*=>\s*\{/.test(content) ||
                        /function\s+\w+\s*\(\{[^}]*\bt\b[^}]*\}\)/.test(content);
    const hasDuplicateT = /const t = useLanguageStore/.test(content);
    
    if (hasTInProps && hasDuplicateT) {
        console.log(`[DUPLICATE t] ${f} - removing redundant hook`);
        content = content.replace(/\s*const t = useLanguageStore\(s => s\.t\);\n?/g, '\n');
        fs.writeFileSync(f, content, 'utf8');
        fixCount++;
    }
});

console.log(`\nFixed ${fixCount} duplicate t declarations`);