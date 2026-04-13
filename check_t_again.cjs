const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) walk(fullPath, fileList);
            else if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.ts')) fileList.push(fullPath);
        }
    } catch(e) {}
    return fileList;
}

const allFiles = walk('src');
let issues = [];

allFiles.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    let hasLanguageStoreImport = content.includes('useLanguageStore') || content.includes('useLanguage');
    let hasTProp = content.match(/function.*\{.*t.*\}/) || content.match(/\(\{.*t.*\}\)\s*=>/);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/(?<![a-zA-Z_.\d])t\s*\(\s*['"`]/)) {
            // Check if there is a `t` definition in this specific function's scope or file scope
            if (!hasLanguageStoreImport && !hasTProp) {
                issues.push(`[${f}:${i+1}] ${line.trim()}`);
            }
        }
    }
});

console.log(`Found ${issues.length} potential issues:`);
issues.forEach(i => console.log(i));