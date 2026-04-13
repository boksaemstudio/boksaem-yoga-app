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

// Check all admin components
const adminFiles = walk('src/components/admin');
const pageFiles = walk('src/pages');
const allFiles = [...adminFiles, ...pageFiles];
let issues = 0;

allFiles.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    // Check if file uses t( pattern
    const usesT = /[^a-zA-Z_]t\([\'\"]/.test(content);
    if (!usesT) return;
    
    // Check if t is properly defined
    const hasTDef = /const\s+(?:t|\{\s*(?:.*\bt\b.*)\s*\})\s*=\s*(?:useLanguageStore|useLanguage)/.test(content) ||
                    /\{[^}]*\bt\b[^}]*\}\s*(?:=\s*props|\)\s*=>)/.test(content) ||
                    /const\s+t\s*=\s*useLanguageStore/.test(content);
    
    // Also check if t is received as prop
    const hasTAsProp = /\(\{[^}]*\bt\b[^}]*\}\)/.test(content) ||
                       /props\.t/.test(content) ||
                       /=\s*\(\{[^}]*\bt\b/.test(content);
    
    if (!hasTDef && !hasTAsProp) {
        console.log(`[MISSING t] ${f}`);
        // Show the first usage
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (/[^a-zA-Z_]t\([\'\"]/.test(lines[i])) {
                console.log(`  Line ${i+1}: ${lines[i].trim().substring(0, 100)}`);
                break;
            }
        }
        issues++;
    }
});

console.log(`\nTotal files with missing t: ${issues}`);