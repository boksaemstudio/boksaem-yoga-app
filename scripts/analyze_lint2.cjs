const fs = require('fs');
const text = fs.readFileSync('lint_round2.txt', 'utf-8');
const lines = text.split('\n');

const ruleCount = {};
const fileErrors = {};
let curFile = null;

for (const line of lines) {
  const fileMatch = line.match(/^([A-Z]:\\.*?)$/);
  if (fileMatch) {
    curFile = fileMatch[1].replace(/.*yoga-app./, '');
    continue;
  }
  
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
  
  // eslint-disable directive warnings
  if (line.includes('Unused eslint-disable')) {
    ruleCount['unused-disable'] = (ruleCount['unused-disable'] || 0) + 1;
    if (curFile) {
      if (!fileErrors[curFile]) fileErrors[curFile] = { errors: 0, warnings: 0, rules: {} };
      fileErrors[curFile].warnings++;
    }
  }
}

console.log('=== RULES ===');
Object.entries(ruleCount).sort((a, b) => b[1] - a[1]).forEach(([r, c]) => console.log(`  ${String(c).padStart(4)} ${r}`));

console.log('\n=== FILES WITH ERRORS (errors only) ===');
Object.entries(fileErrors)
  .filter(([, d]) => d.errors > 0)
  .sort((a, b) => b[1].errors - a[1].errors)
  .forEach(([f, d]) => {
    console.log(`  ${d.errors}e ${d.warnings}w ${f}`);
    Object.entries(d.rules).sort((a,b)=>b[1]-a[1]).slice(0,3).forEach(([r,c])=>console.log(`      ${c}x ${r}`));
  });
