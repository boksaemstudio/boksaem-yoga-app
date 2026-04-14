const fs = require('fs');
const path = require('path');

function scan(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory() && !f.name.includes('node_modules') && !f.name.includes('dist')) {
      files.push(...scan(p));
    } else if (f.isFile() && (f.name.endsWith('.jsx') || f.name.endsWith('.js')) && !f.name.endsWith('.test.js') && !f.name.endsWith('.test.jsx')) {
      files.push(p);
    }
  }
  return files;
}

const srcFiles = scan('src');
const broken = [];

for (const f of srcFiles) {
  const c = fs.readFileSync(f, 'utf8');
  const lines = c.split('\n');

  // Find lines with standalone t( calls - translation function pattern
  const tLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match: t('key') or t("key") or t(`key`) but NOT .t( or _t( or at( or set( etc
    // Also match t( at start of expression context
    if (/(?<![a-zA-Z_.$])t\s*\(/.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
      tLines.push(i + 1);
    }
  }
  if (tLines.length === 0) continue;

  // Check if t is properly defined in this file
  const hasHookT = /const\s+t\s*=\s*useLanguageStore/.test(c);
  const hasGetStateT = c.includes('useLanguageStore.getState().t');
  const hasDestructT = /const\s*\{[^}]*\bt\b[^}]*\}\s*=/.test(c);
  const hasParamT = /\(\s*\{[^}]*\bt\b[^}]*\}\s*\)/.test(c);
  const hasMemoT = /const\s+t\s*=\s*useMemo/.test(c);
  const hasLetT = /let\s+t\s*=/.test(c);
  const hasVarT = /var\s+t\s*=/.test(c);

  if (!hasHookT && !hasGetStateT && !hasDestructT && !hasParamT && !hasMemoT && !hasLetT && !hasVarT) {
    broken.push({
      file: f.replace(/\\/g, '/'),
      firstTLines: tLines.slice(0, 5),
      totalTCalls: tLines.length
    });
  }
}

console.log(`\n=== FILES WITH t() BUT NO t DEFINITION (${broken.length} files) ===\n`);
broken.forEach(b => {
  console.log(b.file);
  console.log(`  Lines: ${b.firstTLines.join(', ')} (${b.totalTCalls} total)`);
});
