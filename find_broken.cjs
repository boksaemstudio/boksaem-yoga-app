const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) walk(fullPath, fileList);
        else if (file.endsWith('.jsx') || file.endsWith('.js')) fileList.push(fullPath);
    }
    return fileList;
}

const dirs = ['src/components/admin', 'src/pages', 'src/components/common'];
let allFiles = [];
dirs.forEach(d => { try { allFiles = [...allFiles, ...walk(d)]; } catch(e) {} });

const broken = [];
allFiles.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    // Check: uses t(' but does NOT have useLanguageStore import or const t = useLanguageStore
    const usesT = /\{t\('/.test(content);
    const hasImport = content.includes('useLanguageStore');
    const hasHook = /const t = useLanguageStore/.test(content);
    
    if (usesT && (!hasImport || !hasHook)) {
        broken.push({
            file: f,
            hasImport,
            hasHook,
            tCount: (content.match(/\{t\('/g) || []).length
        });
    }
});

console.log(`Found ${broken.length} broken files:`);
broken.forEach(b => {
    console.log(`  ${b.file} (import:${b.hasImport}, hook:${b.hasHook}, t() calls:${b.tCount})`);
});
fs.writeFileSync('broken_files.json', JSON.stringify(broken, null, 2), 'utf8');