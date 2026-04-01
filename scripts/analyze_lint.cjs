const fs = require('fs');
const text = fs.readFileSync('lint_results.txt', 'utf-16le');
const lines = text.split('\n');

const ruleCount = {};
const fileErrors = {};
let curFile = null;

for (const line of lines) {
  // file header line (no leading spaces, contains path)
  const fileMatch = line.match(/^([A-Z]:\\.*?)$/);
  if (fileMatch) {
    curFile = fileMatch[1].replace(/.*yoga-app./, '');
    continue;
  }
  
  // error/warning line
  const match = line.match(/\s+\d+:\d+\s+(error|warning)\s+(.+?)\s{2,}([\w\/-]+)\s*$/);
  if (match) {
    const severity = match[1];
    const rule = match[3];
    ruleCount[rule] = (ruleCount[rule] || 0) + 1;
    if (curFile) {
      if (!fileErrors[curFile]) fileErrors[curFile] = { errors: 0, warnings: 0, rules: {} };
      if (severity === 'error') fileErrors[curFile].errors++;
      else fileErrors[curFile].warnings++;
      fileErrors[curFile].rules[rule] = (fileErrors[curFile].rules[rule] || 0) + 1;
    }
  }
  
  // parsing error
  if (line.includes('Parsing error:') && curFile) {
    ruleCount['parse-error'] = (ruleCount['parse-error'] || 0) + 1;
    if (!fileErrors[curFile]) fileErrors[curFile] = { errors: 0, warnings: 0, rules: {} };
    fileErrors[curFile].errors++;
    fileErrors[curFile].rules['parse-error'] = (fileErrors[curFile].rules['parse-error'] || 0) + 1;
  }
}

console.log('============================================');
console.log('      LINT ERROR ANALYSIS REPORT');
console.log('============================================\n');

console.log('--- TOP RULES (by count) ---');
Object.entries(ruleCount)
  .sort((a, b) => b[1] - a[1])
  .forEach(([rule, count]) => {
    console.log(`  ${String(count).padStart(5)}  ${rule}`);
  });

console.log('\n--- FILES WITH ERRORS (sorted by total) ---');
Object.entries(fileErrors)
  .sort((a, b) => (b[1].errors + b[1].warnings) - (a[1].errors + a[1].warnings))
  .forEach(([file, data]) => {
    console.log(`  ${String(data.errors).padStart(4)}e ${String(data.warnings).padStart(3)}w  ${file}`);
    // Show top rules per file
    Object.entries(data.rules)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .forEach(([rule, count]) => {
        console.log(`           ${String(count).padStart(3)} x ${rule}`);
      });
  });

const totalErrors = Object.values(fileErrors).reduce((s, f) => s + f.errors, 0);
const totalWarnings = Object.values(fileErrors).reduce((s, f) => s + f.warnings, 0);
const totalFiles = Object.keys(fileErrors).length;
console.log(`\n--- SUMMARY ---`);
console.log(`  Total files with issues: ${totalFiles}`);
console.log(`  Total errors:   ${totalErrors}`);
console.log(`  Total warnings: ${totalWarnings}`);
console.log(`  Grand total:    ${totalErrors + totalWarnings}`);
