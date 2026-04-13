const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const stat = fs.statSync(path.join(dir, file));
        if (stat.isDirectory()) {
            walk(path.join(dir, file), fileList);
        } else if(file.endsWith('.jsx')) {
            fileList.push(path.join(dir, file));
        }
    }
    return fileList;
}

const targetDirs = [
    'src/components/admin/tabs',
    'src/components/admin/modals'
];

let allFiles = [];
targetDirs.forEach(d => allFiles = [...allFiles, ...walk(d)]);

const hangulTextRegex = />([^<{}]*[\uac00-\ud7a3]+[^<{}]*)</g;
const hangulStringPropRegex = /([a-zA-Z]+)="([^"]*[\uac00-\ud7a3]+[^"]*)"/g;

let allStrings = new Set();
let modifiedFilesCount = 0;

allFiles.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    if (/[\uac00-\ud7a3]/.test(content) && !content.includes('disable-hangul-check')) {
        let hasChanges = false;
        
        content = content.replace(hangulTextRegex, (match, p1) => {
            const trimmed = p1.trim();
            if(!trimmed) return match;
            if(trimmed.includes('{') || trimmed.includes('}')) return match;
            allStrings.add(trimmed);
            hasChanges = true;
            const escaped = trimmed.replace(/'/g, "\\\'");
            return match.replace(trimmed, `{t('${escaped}')}`);
        });

        content = content.replace(hangulStringPropRegex, (match, propName, p2) => {
            if(!p2.trim()) return match;
            allStrings.add(p2);
            hasChanges = true;
            const escaped = p2.replace(/'/g, "\\\'");
            return `${propName}={t('${escaped}')}`;
        });

        if (hasChanges) {
            if (!content.includes('useLanguageStore')) {
                let depth = f.split(path.sep).length - 2;
                if (depth < 0) depth = 1;
                let relPath = Array(depth).fill('../').join('');
                const importStmt = `\nimport { useLanguageStore } from '${relPath}stores/useLanguageStore';`;
                const importMatch = content.match(/import.*?;/);
                if (importMatch) {
                    content = content.replace(importMatch[0], importMatch[0] + importStmt);
                } else {
                    content = importStmt + '\n' + content;
                }
            }

            if (!content.includes('const t = useLanguageStore')) {
                const constMatch = content.match(/const [A-Z][a-zA-Z0-9]* = \([^)]*\) => {/);
                if (constMatch) {
                    content = content.replace(constMatch[0], constMatch[0] + '\n    const t = useLanguageStore(s => s.t);');
                } else {
                     const functionMatch = content.match(/function [A-Z][a-zA-Z0-9]*\([^)]*\) {/);
                     if (functionMatch) {
                         content = content.replace(functionMatch[0], functionMatch[0] + '\n    const t = useLanguageStore(s => s.t);');
                     }
                }
            }

            fs.writeFileSync(f, content, 'utf8');
            modifiedFilesCount++;
        }
    }
});

fs.writeFileSync('korean_extraction.json', JSON.stringify([...allStrings], null, 2), 'utf8');
console.log(`Modified ${modifiedFilesCount} files. Extracted ${allStrings.size} unique strings.`);