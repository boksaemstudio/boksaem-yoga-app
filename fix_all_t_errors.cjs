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

const results = [];
let fixCount = 0;

allFiles.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    // Check if file uses {t(' pattern but t is not properly defined
    const usesTranslation = /\{t\([\'\"]/.test(content);
    if (!usesTranslation) return;
    
    const hasLanguageStore = content.includes('useLanguageStore');
    const hasUseLanguage = content.includes('useLanguage');
    const hasTDefinition = /const\s+t\s*=\s*useLanguageStore/.test(content) || 
                           /const\s+\{\s*t\s*[,}]/.test(content) ||
                           /const\s+t\s*=\s*.*\.t/.test(content);
    
    if (!hasTDefinition && !hasUseLanguage) {
        console.log(`[BROKEN] ${f} - uses t() but no t definition found`);
        
        // Auto-fix: add import and hook
        let fixed = content;
        
        // Add import if needed
        if (!hasLanguageStore) {
            // Calculate relative path
            const depth = f.split(path.sep).filter(p => p !== '.' ).length - 2;
            const relPath = '../'.repeat(Math.max(depth, 1));
            const importLine = `import { useLanguageStore } from '${relPath}stores/useLanguageStore';`;
            
            // Insert after last import
            const lastImportIdx = fixed.lastIndexOf('import ');
            if (lastImportIdx !== -1) {
                const lineEnd = fixed.indexOf('\n', lastImportIdx);
                fixed = fixed.slice(0, lineEnd + 1) + importLine + '\n' + fixed.slice(lineEnd + 1);
            }
        }
        
        // Add hook if in a component
        // Find component opening: const X = (...) => { or function X(...) {
        const patterns = [
            /const\s+[A-Z]\w*\s*=\s*(?:memo\()?\(\{[^}]*\}\)\s*=>\s*\{/,
            /const\s+[A-Z]\w*\s*=\s*(?:memo\()?\([^)]*\)\s*=>\s*\{/,
            /function\s+[A-Z]\w*\s*\([^)]*\)\s*\{/
        ];
        
        let hookInserted = false;
        for (const pat of patterns) {
            const m = fixed.match(pat);
            if (m) {
                const insertPos = fixed.indexOf(m[0]) + m[0].length;
                if (!fixed.slice(insertPos, insertPos + 200).includes('const t = useLanguageStore')) {
                    fixed = fixed.slice(0, insertPos) + '\n    const t = useLanguageStore(s => s.t);' + fixed.slice(insertPos);
                    hookInserted = true;
                    break;
                }
            }
        }
        
        if (hookInserted) {
            fs.writeFileSync(f, fixed, 'utf8');
            fixCount++;
            console.log(`  -> FIXED: ${f}`);
        } else {
            console.log(`  -> SKIP (could not find component pattern): ${f}`);
        }
        
        results.push({ file: f, fixed: hookInserted });
    }
});

console.log(`\nTotal broken: ${results.length}, Fixed: ${fixCount}`);