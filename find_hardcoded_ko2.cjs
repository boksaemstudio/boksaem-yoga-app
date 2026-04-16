const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        walk(path.join(dir, file), fileList);
      }
    } else if (file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const allFiles = walk('src');
let totalHardcoded = 0;
const results = {};

for (const file of allFiles) {
  // test files
  if (file.includes('.test.') || file.includes('setup.js')) continue;

  const code = fs.readFileSync(file, 'utf8');
  const lines = code.split('\n');
  
  const fileResults = [];
  lines.forEach((line, i) => {
    let tLine = line.trim();
    // Exclude comments
    if (tLine.startsWith('//') || tLine.startsWith('/*') || tLine.startsWith('*') || tLine.startsWith('{/*') || tLine.includes('console.log') || tLine.includes('console.error')) return;
    
    // Look for Korean characters: [\u3131-\uD79D]
    if (/[\u3131-\uD79D]/.test(tLine)) {
      if (!tLine.includes('t(') && !tLine.includes('t"')) {
        fileResults.push({ line: i + 1, text: tLine });
        totalHardcoded++;
      }
    }
  });
  
  if (fileResults.length > 0) {
    results[file] = fileResults;
  }
}

console.log(`\n=== Hardcoded Korean UI Text Audit ===`);
let fileCount = 0;
for (const [file, lines] of Object.entries(results)) {
    if (file.includes('translations.js') || file.includes('demoLocalization.js')) continue;
    
    fileCount++;
    console.log(`\n📄 ${file} (${lines.length} lines)`);
    lines.slice(0, 5).forEach(l => console.log(`  L${l.line}: ${l.text}`));
    if (lines.length > 5) console.log(`  ... and ${lines.length - 5} more.`);
}
console.log(`\nTotal hardcoded lines found: ${totalHardcoded} across ${fileCount} files.`);
