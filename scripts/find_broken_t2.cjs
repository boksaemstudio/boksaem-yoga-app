const fs = require('fs');
const path = require('path');

function scan(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory() && !f.name.includes('node_modules') && !f.name.includes('dist')) {
      files.push(...scan(p));
    } else if (f.isFile() && (f.name.endsWith('.jsx') || f.name.endsWith('.js')) && !f.name.endsWith('.test.js')) {
      files.push(p);
    }
  }
  return files;
}

const srcFiles = scan('src');
const broken = [];

for (const f of srcFiles) {
  const c = fs.readFileSync(f, 'utf8');
  if (!c.includes('t("g_')) continue;
  
  // Check if t is properly defined
  const hasHookT = /const\s+t\s*=\s*useLanguageStore/.test(c);
  const hasParamT = /=\s*\(\s*[^)]*\bt\b[^)]*\)\s*=>/.test(c) || /function\s+\w+\s*\([^)]*\bt\b[^)]*\)/.test(c);
  const hasGetStateT = c.includes('useLanguageStore.getState().t');
  const hasDestructT = /const\s*\{[^}]*\bt\b[^}]*\}\s*=/.test(c);
  
  if (!hasHookT && !hasParamT && !hasGetStateT && !hasDestructT) {
    const lines = c.split('\n');
    const tLines = lines.map((l, i) => l.includes('t("g_') ? i + 1 : null).filter(Boolean);
    broken.push({
      file: f.replace(/\\/g, '/'),
      firstTLines: tLines.slice(0, 5),
      totalTCalls: tLines.length
    });
  }
}

console.log(`\n=== FILES WITH t() BUT NO t DEFINITION (${broken.length} files) ===\n`);
broken.forEach(b => {
  console.log(`${b.file}`);
  console.log(`  Lines: ${b.firstTLines.join(', ')} (${b.totalTCalls} total)`);
});
