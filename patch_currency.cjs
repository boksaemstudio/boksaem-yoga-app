const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getFiles(fullPath, files);
        } else if (fullPath.endsWith('.jsx')) {
            files.push(fullPath);
        }
    }
    return files;
}

const files = getFiles('src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Check if it has .toLocaleString() + '원' or similar
    if (content.match(/\.toLocaleString\(\)\s*\+\s*['"`]원['"`]/g) || content.match(/\.toLocaleString\(\)\s*\}\s*원/g)) {
        
        // 1. Add import for formatCurrency if not exists
        if (!content.includes('formatCurrency')) {
            // Find a good place to put import (after last import)
            const importMatch = content.match(/import.*?;?\n/g);
            if (importMatch) {
                const lastImport = importMatch[importMatch.length - 1];
                const relativePath = file.split('/').length > 2 ? '../'.repeat(file.split('/').length - 2) + 'utils/formatters' : './utils/formatters';
                content = content.replace(lastImport, lastImport + `import { formatCurrency } from '${relativePath}';\n`);
            } else {
                content = `import { formatCurrency } from '../utils/formatters';\n` + content;
            }
        }

        // 2. Add language to the component if not exists
        // Most components already have `const t = useLanguageStore(...)`
        if (!content.includes('const language = useLanguageStore(s => s.language)')) {
            if (content.includes('const t = useLanguageStore')) {
                content = content.replace(/const t = useLanguageStore\(s => s\.t\);/g, 'const t = useLanguageStore(s => s.t);\n  const language = useLanguageStore(s => s.language);');
            }
        }

        // 3. Replace patterns
        // e.toLocaleString() + '원' => formatCurrency(e, language)
        content = content.replace(/([a-zA-Z0-9_.]+)\.toLocaleString\(\)\s*\+\s*['"`]원['"`]/g, 'formatCurrency($1, language)');
        
        // {e.toLocaleString()}원 => {formatCurrency(e, language)}
        content = content.replace(/\{([a-zA-Z0-9_.]+)\.toLocaleString\(\)\}\s*원/g, '{formatCurrency($1, language)}');

        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log('Patched:', file);
    }
});
