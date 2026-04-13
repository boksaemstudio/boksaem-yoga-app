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
    
    // Check if it has t(
    if (!content.includes('t(')) return;
    
    // Check if it's missing useLanguageStore
    let hasImport = content.includes('useLanguageStore') || content.includes('useLanguage');
    
    if (!hasImport) {
        // Double check if t is actually called
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/(?<![a-zA-Z_.$])t\s*\(/)) {
                // exclude components that receive `t` as a prop: (t) => or { t }
                const receiveT = content.match(/t\s*=>/) || content.match(/\(\s*t\s*,/) || content.match(/,\s*t\s*\)/) || content.match(/{\s*t\s*}/) || content.match(/function.*\(.*t.*\)/);
                if (!receiveT) {
                    issues.push(`[${f}:${i+1}] ${lines[i].trim()}`);
                }
            }
        }
    }
});

console.log(`Found issues without useLanguageStore import:`);
issues.forEach(i => console.log(i));