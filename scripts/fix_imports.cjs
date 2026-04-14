const fs = require('fs');
const path = require('path');

function fixImports(dir, depth) {
    const files = fs.readdirSync(dir);
    for (let f of files) {
        const fullPath = path.join(dir, f);
        if (fs.statSync(fullPath).isDirectory()) {
            fixImports(fullPath, depth + 1);
        } else if (f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.ts')) {
            let c = fs.readFileSync(fullPath, 'utf8');
            
            let prefix = '../'.repeat(depth) + 'stores/useLanguageStore';
            if (depth === 0) prefix = './stores/useLanguageStore';
            
            if (c.includes('useLanguageStore')) {
                // Regex to find import { useLanguageStore } from '...';
                c = c.replace(/import \{ useLanguageStore \} from '.*';/g, `import { useLanguageStore } from '${prefix}';`);
                c = c.replace(/import \{ useLanguageStore as useLanguage \} from '.*';/g, `import { useLanguageStore as useLanguage } from '${prefix}';`);
                fs.writeFileSync(fullPath, c);
            }
        }
    }
}

fixImports(path.join(__dirname, '../src'), 0);
console.log('Fixed relative paths for stores');
