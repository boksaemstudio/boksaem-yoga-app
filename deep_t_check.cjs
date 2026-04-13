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

// Check ALL files
const allFiles = walk('src');
let issues = [];

allFiles.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, idx) => {
        // Matches: t('key') or t("key") but NOT this.t, event.t, etc.
        // Should be a standalone function call
        if (/(?<![a-zA-Z_.])t\([\'\"]/.test(line)) {
            // Check if t is defined ANYWHERE in the file
            const hasTDef = 
                /const\s+t\s*=/.test(content) ||
                /const\s+\{[^}]*\bt\b/.test(content) ||
                /function\s+\w+\s*\(\{[^}]*\bt\b/.test(content) ||
                /\(\{[^}]*\bt\b[^}]*\}\)/.test(content) ||
                /\(\s*\{[^}]*\bt\b[^}]*\}\s*,/.test(content) ||
                /options\.t\b/.test(content) ||
                /\bt\s*,\s*language/.test(content);
            
            if (!hasTDef) {
                issues.push({ file: f, line: idx + 1, text: line.trim().substring(0, 120) });
            }
        }
    });
});

if (issues.length > 0) {
    console.log(`Found ${issues.length} uses of t() without definition:`);
    issues.forEach(i => {
        console.log(`\n[${i.file}:${i.line}]`);
        console.log(`  ${i.text}`);
    });
} else {
    console.log('All uses of t() have proper definitions. No issues found.');
}