import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.join(__dirname, '..', 'src');
const issues = [];

const silentCatchRegex = /catch\s*\([^)]+\)\s*\{\s*(?:console\.(?:error|log|warn)\([^)]+\);?\s*)?\}/g;
const cryptoRegex = /(?<!typeof\s+)crypto\.randomUUID/g;
const letInIfRegex = /if\s*\([^)]+\)\s*\{[^}]*let\s+([a-zA-Z0-9_]+)\s*=[^}]+}/g;

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            scanDirectory(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            scanFile(fullPath);
        }
    }
}

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(targetDir, filePath);
    const lines = content.split('\n');

    let match;
    while ((match = silentCatchRegex.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        issues.push({ type: 'SILENT_CATCH', file: relPath, line: lineNum, snippet: match[0].replace(/\s+/g, ' ').substring(0, 50) + '...' });
    }

    while ((match = cryptoRegex.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        const lineStr = lines[lineNum - 1] || '';
        if (!lineStr.includes('typeof crypto !== \'undefined\'') && !lineStr.includes('safeUUID')) {
            issues.push({ type: 'UNSAFE_CRYPTO', file: relPath, line: lineNum, snippet: lineStr.trim() });
        }
    }

    while ((match = letInIfRegex.exec(content)) !== null) {
        const varName = match[1];
        const blockEnd = match.index + match[0].length;
        const remainingContent = content.substring(blockEnd);
        const usageRegex = new RegExp(`\\b${varName}\\b`);
        if (usageRegex.test(remainingContent)) {
             const lineNum = content.substring(0, match.index).split('\n').length;
             issues.push({ type: 'POSSIBLE_SCOPE_LEAK', file: relPath, line: lineNum, snippet: `let ${varName} declared in block` });
        }
    }

    lines.forEach((line, i) => {
        if (line.includes('<Icons.') && !content.includes('import { Icons }') && !content.includes('import Icons')) {
             issues.push({ type: 'MISSING_IMPORT', file: relPath, line: i + 1, snippet: line.trim() });
        }
        if (line.includes('window.location.hostname === \'localhost\'')) {
             issues.push({ type: 'HARDCODED_LOCALHOST', file: relPath, line: i + 1, snippet: line.trim() });
        }
    });
}

scanDirectory(targetDir);
console.log(JSON.stringify(issues, null, 2));
