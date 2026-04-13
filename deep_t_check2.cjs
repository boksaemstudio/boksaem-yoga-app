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

// Check ALL files more carefully
const allFiles = walk('src');
let issues = [];

allFiles.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    // Look for bare `t(` usage that's NOT a method call and NOT commented
    const lines = content.split('\n');
    let hasTDefinition = false;
    
    // Check all forms of t definition
    if (/const\s+t\s*=\s*useLanguageStore/.test(content)) hasTDefinition = true;
    if (/const\s+\{\s*[^}]*\bt\b[^}]*\}\s*=\s*useLanguage/.test(content)) hasTDefinition = true;
    if (/\(\{[^}]*\bt\b[^}]*\}\)\s*(?:=>|{)/.test(content)) hasTDefinition = true;
    if (/\(\{[^}]*\bt\b[^}]*\},/.test(content)) hasTDefinition = true;
    if (/options\.t/.test(content) || /params\.t/.test(content)) hasTDefinition = true;
    if (/function\s+\w+\s*\(\{[^}]*\bt\b/.test(content)) hasTDefinition = true;
    
    // Specifically check for `t(` not preceded by word chars or dots
    let usesT = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('//') || line.startsWith('*')) continue;
        
        // Match standalone t() calls
        const matches = line.match(/(?<![a-zA-Z_.\d])t\s*\(\s*['\"`]/g);
        if (matches) {
            usesT = true;
            if (!hasTDefinition) {
                issues.push({ file: f, line: i + 1, text: line.substring(0, 120) });
            }
        }
    }
});

if (issues.length > 0) {
    console.log(`Found ${issues.length} problematic t() uses:`);
    issues.forEach(i => console.log(`\n[${i.file}:${i.line}] ${i.text}`));
} else {
    console.log('No issues found. All t() calls have proper definitions.');
}