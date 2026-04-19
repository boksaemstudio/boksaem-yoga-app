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

    // Check if it renders a member.phone or similar commonly used variable inside JSX
    // This is heuristic-based to find `{member.phone}` or `{m.phone}`
    if (content.match(/\{([a-zA-Z0-9_]+)\.phone\}/g)) {
        
        if (!content.includes('formatPhoneNumber')) {
            const importMatch = content.match(/import.*?;?\n/g);
            if (importMatch) {
                const lastImport = importMatch[importMatch.length - 1];
                const relativePath = file.split('/').length > 2 ? '../'.repeat(file.split('/').length - 2) + 'utils/formatters' : './utils/formatters';
                content = content.replace(lastImport, lastImport + `import { formatPhoneNumber } from '${relativePath}';\n`);
            }
        }

        if (!content.includes('const language = useLanguageStore(s => s.language)')) {
            if (content.includes('const t = useLanguageStore')) {
                content = content.replace(/const t = useLanguageStore\(s => s\.t\);/g, 'const t = useLanguageStore(s => s.t);\n  const language = useLanguageStore(s => s.language);');
            }
        }

        content = content.replace(/\{([a-zA-Z0-9_]+)\.phone\}/g, '{formatPhoneNumber($1.phone, language)}');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log('Patched phone in:', file);
    }
});
