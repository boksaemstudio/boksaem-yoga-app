const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) walk(fullPath, fileList);
            else if (file.endsWith('.jsx')) fileList.push(fullPath);
        }
    } catch(e) {}
    return fileList;
}

const allFiles = walk('src/components/admin');
let issues = [];

allFiles.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if (!content.includes('t(')) return;
    
    // We already know t is used.
    // Let's count how many times `useLanguageStore` is declared vs how many components exist.
    // Actually, just find strings like `memo((...` or `=> {` and see if they contain a `t(` WITHOUT a local `const t =`.
    
    // Simplest way: Split by "const " or "export const " or "function " and check if the block invokes t( but doesn't define t.
    // Let's just do a manual review if there are few files. Find all files with "memo(" or multiple components.
    if (content.match(/const [A-Z]/g) && content.match(/const [A-Z]/g).length > 2) {
        // multiple components
        // just flag it for manual review
        issues.push(f);
    }
});
console.log('Files with multiple components to review:');
issues.forEach(i => console.log(i));