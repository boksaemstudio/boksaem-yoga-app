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
    } else if (file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.js')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const allFiles = walk('src');
let totalHardcoded = 0;
const results = {};

for (const file of allFiles) {
  const code = fs.readFileSync(file, 'utf8');
  const lines = code.split('\n');
  
  const fileResults = [];
  lines.forEach((line, i) => {
    // Skip comments and console.logs and t("...") mapping fallbacks
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.includes('console.log') || line.includes('console.error')) return;
    
    // Look for Korean characters: [\u3131-\uD79D]
    // But we want to exclude ones that are already formatted as t("...") or t('...')
    // A simplified check: if it has Korean, but does NOT match t('...', t("...")) completely
    // Let's just find any Korean character
    if (/[\u3131-\uD79D]/.test(line)) {
      // Check if it's strictly inside a t() fallback like || "한국어" or t("g_xxx") || '한국어'
      // This is tricky via simple regex, but we can look for raw text outside of quotes, or inside quotes that aren't part of a t() call.
      
      // Heuristic: If the line has Korean but no 't(' or 'useLanguageStore', it's likely hardcoded.
      // If it HAS 't(', it might still have hardcoded parts, but let's assume it's mostly handled via fallbacks (which user just saw).
      // Wait, user wants to find ANY hardcoded text that is NOT translated at all.
      // E.g., <div>하드코딩</div>
      
      // Actually, many files don't import useLanguageStore at all.
      if (!line.includes('t(')) {
        fileResults.push({ line: i + 1, text: line.trim() });
        totalHardcoded++;
      }
    }
  });
  
  if (fileResults.length > 0) {
    results[file] = fileResults;
  }
}

console.log(`\n=== Hardcoded Korean Audit (Lines without t() wrapper) ===`);
let fileCount = 0;
for (const [file, lines] of Object.entries(results)) {
    // We don't want to log utils/translations.js because it's the dictionary itself
    if (file.includes('translations.js') || file.includes('translations.js.bak')) continue;
    
    fileCount++;
    console.log(`\n📄 ${file} (${lines.length} lines)`);
    lines.slice(0, 5).forEach(l => console.log(`  L${l.line}: ${l.text}`));
    if (lines.length > 5) console.log(`  ... and ${lines.length - 5} more.`);
}
console.log(`\nTotal hardcoded lines found: ${totalHardcoded} across ${fileCount} files.`);
